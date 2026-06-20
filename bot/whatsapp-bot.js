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
const ALLOWED_NUMBER = process.env.ALLOWED_NUMBER  // e.g. "972501234567"

if (!HOUSEHOLD_ID || !ALLOWED_NUMBER) {
  console.error('❌  Missing env: HOUSEHOLD_ID or ALLOWED_NUMBER')
  process.exit(1)
}

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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  },
})

client.on('qr', qr => {
  console.log('\nסרוק את ה-QR הזה מ-WhatsApp → מכשירים מקושרים:\n')
  qrcode.generate(qr, { small: true })
})

client.on('ready', () => {
  console.log('✅  WhatsApp bot מחובר ומוכן לקבל קבצים')
})

client.on('auth_failure', () => {
  console.error('❌  אימות נכשל — מחק את תיקיית .wwebjs_auth ונסה שוב')
})

client.on('message', async message => {
  // Security: only handle messages from the allowed number
  const senderNumber = message.from.replace('@c.us', '')
  if (senderNumber !== ALLOWED_NUMBER) return

  if (!message.hasMedia) {
    // Help text on plain message
    if (message.body.trim() === 'עזרה' || message.body.trim().toLowerCase() === 'help') {
      await message.reply('שלח לי קובץ CSV או Excel של תנועות בנק ואכניס אותו אוטומטית לאפליקציה 💳')
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

  // Check extension from filename or mimetype
  const filename = media.filename || `file.${mimeToExt(media.mimetype)}`
  const ext = filename.split('.').pop().toLowerCase()

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
})

client.initialize()

function mimeToExt(mime = '') {
  if (mime.includes('csv') || mime.includes('plain')) return 'csv'
  if (mime.includes('openxmlformats')) return 'xlsx'
  if (mime.includes('ms-excel')) return 'xls'
  return 'csv'
}
