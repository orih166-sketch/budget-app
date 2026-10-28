import { tokenMatches } from './_applepay-token.js'

// נקרא מהקיצור באייפון (אוטומציה "ארנק" → "קבלת תוכן מ-URL") אחרי תשלום ב-Apple Pay.
// הכתובת כוללת ?u=<מייל>&t=<טוקן אישי>; הגוף: {amount, merchant, card}.

const allowedEmails = () =>
  (process.env.SHEET_ALLOWED_EMAILS || 'orih166@gmail.com,afek2002m@gmail.com')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })
  const email = String(req.query.u || '').toLowerCase()
  if (!allowedEmails().includes(email) || !tokenMatches(email, req.query.t)) return res.status(401).json({ ok: false, error: 'unauthorized' })

  const b = req.body || {}
  const params = { email, amount: b.amount ?? b['סכום'], merchant: b.merchant ?? b['סוחר'] ?? b.name, card: b.card ?? b['כרטיס'] }
  try {
    const r = await fetch(process.env.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: process.env.GAS_KEY, action: 'applePay', params }),
    })
    const out = JSON.parse(await r.text())
    if (!out.ok) return res.status(200).json({ ok: false, error: out.error })
    return res.status(200).json({ ok: true, category: out.data.category })
  } catch {
    return res.status(502).json({ ok: false, error: 'אין חיבור לגיליון' })
  }
}
