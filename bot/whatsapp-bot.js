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

import qrcode  from 'qrcode-terminal'
import pkg     from 'whatsapp-web.js'
import { parseFile }          from './parser.js'
import { upsertTransactions } from './db.js'

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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  },
})

client.on('qr', qr => {
  console.log('\nסרוק את ה-QR הזה מ-WhatsApp → מכשירים מקושרים:\n')
  qrcode.generate(qr, { small: true })
})

client.on('ready', async () => {
  console.log('✅  WhatsApp bot מחובר ומוכן לקבל קבצים')

  if (GROUP_NAME) {
    const chats = await client.getChats()
    const group = chats.find(c => c.isGroup && c.name === GROUP_NAME)
    if (group) {
      allowedGroupId = group.id._serialized
      console.log(`✅  קבוצה נמצאה: "${GROUP_NAME}" (${allowedGroupId})`)
    } else {
      console.warn(`⚠️  קבוצה "${GROUP_NAME}" לא נמצאה — מאזין רק למספר האישי`)
    }
  }
})

client.on('auth_failure', () => {
  console.error('❌  אימות נכשל — מחק את תיקיית .wwebjs_auth ונסה שוב')
})

async function handleMessage(message) {
  const fromId       = message.from
  const authorNumber = (message.author || message.from).replace('@c.us', '').replace('@g.us', '')
  const isFromGroup  = allowedGroupId && fromId === allowedGroupId
  const isDirectSelf = message.fromMe && !isFromGroup

  // Accept: messages in the allowed group from allowed numbers, or direct self-messages
  if (!isFromGroup && !isDirectSelf) return
  if (isFromGroup && !ALLOWED_NUMBERS.has(authorNumber)) return

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
