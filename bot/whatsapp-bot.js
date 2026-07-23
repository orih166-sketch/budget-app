/**
 * whatsapp-bot.js — WhatsApp bank-file importer
 *
 * Run: node bot/whatsapp-bot.js
 * First run: scan QR in terminal with WhatsApp → Linked Devices
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   HOUSEHOLD_ID       — your Supabase household_id
 *   ALLOWED_NUMBER     — your WhatsApp number in international format, e.g. 972501234567
 */

import qrcode        from 'qrcode-terminal'
import QRCode        from 'qrcode'
import fs            from 'fs'
import { exec }      from 'child_process'
import pkg           from 'whatsapp-web.js'
import { parseFile }          from './parser.js'
import { upsertTransactions } from './db.js'
import { createClient }       from '@supabase/supabase-js'

const sbNotif = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const { Client, LocalAuth, MessageMedia } = pkg

const HOUSEHOLD_ID   = process.env.HOUSEHOLD_ID
const ALLOWED_NUMBER = process.env.ALLOWED_NUMBER
const WIFE_NUMBER    = process.env.WIFE_NUMBER
const GROUP_NAME     = process.env.GROUP_NAME

const ALLOWED_NUMBERS = new Set([ALLOWED_NUMBER, WIFE_NUMBER].filter(Boolean))

if (!HOUSEHOLD_ID || !ALLOWED_NUMBER) {
  console.error('❌  Missing env: HOUSEHOLD_ID or ALLOWED_NUMBER')
  process.exit(1)
}

let allowedGroupId = null  // resolved on 'ready'

const ALLOWED_MIME = new Set([
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',  // WhatsApp sometimes sends this for xlsx
])

const ALLOWED_EXT = new Set(['csv', 'txt', 'xls', 'xlsx'])

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
  puppeteer: {
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    protocolTimeout: 60000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  },
})

client.on('qr', async qr => {
  console.log('\n📱  פותח QR בדפדפן לסריקה...\n')
  qrcode.generate(qr, { small: true })

  // Save QR as image and open in browser
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>WhatsApp QR</title>
<style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#111;font-family:sans-serif;color:#fff}
img{width:300px;height:300px;border-radius:16px;background:#fff;padding:16px}
p{margin-top:20px;opacity:.6;font-size:14px}</style></head>
<body>
<img src="${await QRCode.toDataURL(qr, { width: 300 })}" />
<p>WhatsApp → הגדרות → מכשירים מקושרים → קשר מכשיר → סרוק</p>
</body></html>`

  const path = '/tmp/whatsapp-qr.html'
  fs.writeFileSync(path, html)
  exec(`open "${path}"`)
})

// ── שליחת התראות ממתינות ─────────────────────────────────────
async function pollAndSendNotifications() {
  try {
    const { data, error } = await sbNotif
      .from('pending_notifications')
      .select('*')
      .is('sent_at', null)
      .order('created_at', { ascending: true })
      .limit(20)

    if (error) { console.warn('poll notifications error:', error.message); return }
    if (!data?.length) return

    for (const notif of data) {
      try {
        const target = `${ALLOWED_NUMBER}@c.us`
        await client.sendMessage(target, notif.message)
        await sbNotif
          .from('pending_notifications')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', notif.id)
        console.log(`📤  נשלחה התראה [${notif.type}]:`, notif.message.slice(0, 60))
      } catch (e) {
        console.error('שגיאה בשליחת התראה:', e.message)
      }
    }
  } catch (e) {
    console.warn('pollAndSendNotifications:', e.message)
  }
}

client.on('ready', async () => {
  console.log('✅  WhatsApp bot מחובר ומוכן לקבל קבצים')

  // הפעל polling להתראות: תוך 10 שניות ואז כל 30 דקות
  setTimeout(pollAndSendNotifications, 10_000)
  setInterval(pollAndSendNotifications, 30 * 60 * 1000)

  if (GROUP_NAME) {
    // מחכה קצת לפני getChats כדי ש-WhatsApp Web יסיים לטעון
    setTimeout(async () => {
      try {
        const chats = await client.getChats()
        const normalize = s => s?.normalize('NFC').trim() ?? ''
        const group = chats.find(c => c.isGroup && normalize(c.name) === normalize(GROUP_NAME))
        if (group) {
          allowedGroupId = group.id._serialized
          console.log(`✅  קבוצה נמצאה: "${GROUP_NAME}" (${allowedGroupId})`)
        } else {
          console.warn(`⚠️  קבוצה "${GROUP_NAME}" לא נמצאה — מאזין רק למספר האישי`)
        }
      } catch (e) {
        console.warn('⚠️  לא הצליח לטעון קבוצות:', e.message)
      }
    }, 5000)
  }
})

client.on('auth_failure', () => {
  console.error('❌  אימות נכשל — מחק את תיקיית .wwebjs_auth ונסה שוב')
})

async function handleMessage(message) {
  let chat
  try { chat = await message.getChat() } catch { return }

  const isGroup     = chat.isGroup
  const normalize   = s => s?.normalize('NFC').trim() ?? ''
  const isRightGroup = isGroup && GROUP_NAME && normalize(chat.name) === normalize(GROUP_NAME)
  const isDirectSelf = message.fromMe && !isGroup

  if (!isRightGroup && !isDirectSelf) return

  console.log('💬  הודעה מ:', chat.name || chat.id._serialized, '| fromMe:', message.fromMe)

  // In group: only process messages from allowed numbers
  if (isRightGroup) {
    const authorId = (message.author || message.from || '').replace(/@.+/, '')
    if (!message.fromMe && !ALLOWED_NUMBERS.has(authorId)) return
  }

  console.log('📨  הודעה התקבלה:', { from: message.from, hasMedia: message.hasMedia, fromMe: message.fromMe })

  if (!message.hasMedia) {
    const text = message.body.trim()
    if (text === 'עזרה' || text.toLowerCase() === 'help') {
      await message.reply('שלח קובץ CSV/Excel מהבנק, או כתוב הוצאה בפורמט:\n"260 דלק" / "פילאטס 80" / "קפה 18 שח"')
      return
    }
    // Try to parse as a quick expense: "260 דלק" / "דלק 260" / "260 ש״ח דלק"
    const expense = parseTextExpense(text)
    if (expense) {
      try {
        const today = new Date().toISOString().split('T')[0]
        await upsertTransactions([{ ...expense, date: today }], HOUSEHOLD_ID)
        await message.reply(`✅ נרשם: *${expense.desc}* — ${expense.amount} ₪`)
      } catch (err) {
        await message.reply(`❌ שגיאה: ${err.message}`)
      }
    }
    return
  }

  let media
  try {
    media = await message.downloadMedia()
  } catch {
    await message.reply('❌  לא הצלחתי להוריד את הקובץ, נסה שוב.')
    return
  }

  const filename = media.filename || `file.${mimeToExt(media.mimetype)}`
  const ext = filename.split('.').pop().toLowerCase()

  console.log('📎  קובץ:', filename, media.mimetype)

  if (!ALLOWED_EXT.has(ext) && !ALLOWED_MIME.has(media.mimetype)) {
    await message.reply(`⚠️  סוג קובץ לא נתמך (${media.mimetype || ext}). שלח CSV או Excel.`)
    return
  }

  await message.reply('⏳  מעבד את הקובץ...')

  try {
    const buffer = Buffer.from(media.data, 'base64')
    const txns   = await parseFile(buffer, filename)

    if (txns.length === 0) {
      await message.reply('⚠️  לא נמצאו תנועות בקובץ. ודא שהקובץ מכיל עמודות של תאריך, תיאור וסכום.')
      return
    }

    const { added, total } = await upsertTransactions(txns, HOUSEHOLD_ID)

    const skipped = total - added
    let reply = `✅  נקלטו בהצלחה *${added}* תנועות חדשות ב-Supabase!`
    if (skipped > 0) reply += `\n(${skipped} תנועות כבר היו קיימות ודולגו)`

    await message.reply(reply)
  } catch (err) {
    console.error('parse/upsert error:', err)
    await message.reply(`❌  שגיאה בעיבוד הקובץ: ${err.message}`)
  }
}

// 'message' = הודעות נכנסות, 'message_create' = כולל הודעות ששלחת לעצמך
client.on('message',        handleMessage)
client.on('message_create', handleMessage)

client.initialize()

function parseTextExpense(text) {
  // Remove currency words
  const cleaned = text.replace(/ש[״"]ח|שח|₪|NIS/gi, '').trim()

  // Pattern: number first — "260 דלק" / "260.5 קפה"
  let m = cleaned.match(/^(\d+(?:[.,]\d+)?)\s+(.{2,})$/)
  if (m) {
    return { amount: parseFloat(m[1].replace(',', '.')), desc: m[2].trim(), type: 'expense' }
  }

  // Pattern: description first — "דלק 260"
  m = cleaned.match(/^(.{2,})\s+(\d+(?:[.,]\d+)?)$/)
  if (m) {
    return { amount: parseFloat(m[2].replace(',', '.')), desc: m[1].trim(), type: 'expense' }
  }

  return null
}

function mimeToExt(mime = '') {
  if (mime.includes('csv') || mime.includes('plain')) return 'csv'
  if (mime.includes('openxmlformats')) return 'xlsx'
  if (mime.includes('ms-excel')) return 'xls'
  return 'csv'
}
