import { tokenMatches } from './_applepay-token.js'
import { callGas } from './_gas.js'

// נקרא מהקיצור באייפון (אוטומציה "ארנק" → "קבלת תוכן מ-URL") אחרי תשלום ב-Apple Pay.
// הכתובת כוללת ?u=<מייל>&t=<טוקן אישי>; הגוף: {amount, merchant, card}.

const allowedEmails = () =>
  (process.env.SHEET_ALLOWED_EMAILS || 'orih166@gmail.com,afek2002m@gmail.com')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })
  const email = String(req.query.u || '').toLowerCase()
  if (!allowedEmails().includes(email) || !tokenMatches(email, req.query.t)) return res.status(401).json({ ok: false, error: 'unauthorized' })

  let b = req.body || {}
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = {} } }
  const params = { email, amount: b.amount ?? b['סכום'], merchant: b.merchant ?? b['סוחר'] ?? b.name, card: b.card ?? b['כרטיס'] }
  try {
    // תשלום נרשם פעם אחת בלבד: אין ניסיון חוזר, כדי שלא תיווצר שורה כפולה אם הגיליון כבר רשם ורק התשובה התעכבה
    const out = await callGas('applePay', params, { tries: 1 })
    if (!out.ok) { console.log('applepay rejected:', out.error); return res.status(200).json({ ok: false, error: out.error }) }
    return res.status(200).json({ ok: true, category: out.data.category })
  } catch (e) {
    console.log('applepay failed:', e.message)
    return res.status(502).json({ ok: false, error: 'אין חיבור לגיליון' })
  }
}
