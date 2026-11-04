import { createClient } from '@supabase/supabase-js'
import { applePayToken } from './_applepay-token.js'
import { callGas } from './_gas.js'

const READS = new Set(['bootstrap', 'transactions', 'month', 'cashflow', 'savings', 'savingsPending', 'budgetPlan', 'pushGet', 'pasteAnalyze'])

// גשר בין האפליקציה לגיליון "תכנון מקצועי 2026" (Apps Script, Api.gs).
// המפתח של הגיליון נשאר רק כאן בשרת; הדפדפן שולח רק את טוקן ההתחברות של Supabase.

const ACTIONS = new Set([
  'bootstrap', 'transactions', 'month', 'quickAdd', 'addStructured', 'undo',
  'updateTx', 'deleteTx', 'cashflow', 'setBalance', 'savings',
  'pasteAnalyze', 'bankImport',
  'savingsSetup', 'savingsPending', 'savingsAllocate',
  'budgetPlan', 'budgetSave', 'setCushion',
  'pushGet', 'pushSubscribe', 'pushUnsubscribe', 'pushPrefs', 'pushTest',
])
// פעולות שהגיליון צריך לדעת עבור מי הן — המייל נלקח מההתחברות, לא ממה שהדפדפן שלח
const PER_USER = new Set(['pushGet', 'pushSubscribe', 'pushUnsubscribe', 'pushPrefs', 'pushTest'])

const allowedEmails = () =>
  (process.env.SHEET_ALLOWED_EMAILS || 'orih166@gmail.com,afek2002m@gmail.com')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ ok: false, error: 'צריך להתחבר' })

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  )
  const { data, error } = await supabase.auth.getUser(token)
  const email = data?.user?.email?.toLowerCase()
  if (error || !email) return res.status(401).json({ ok: false, error: 'צריך להתחבר מחדש' })
  if (!allowedEmails().includes(email)) return res.status(403).json({ ok: false, error: 'אין לחשבון הזה גישה לתקציב' })

  const { action, params } = req.body || {}

  // קישור אישי לקיצור של Apple Pay — לא צריך את הגיליון
  if (action === 'applePayLink') {
    const host = `https://${req.headers['x-forwarded-host'] || req.headers.host}`
    return res.status(200).json({ ok: true, data: { url: `${host}/api/applepay?u=${encodeURIComponent(email)}&t=${applePayToken(email)}` } })
  }
  if (!ACTIONS.has(action)) return res.status(400).json({ ok: false, error: 'פעולה לא מוכרת' })
  const sent = PER_USER.has(action) ? { ...(params || {}), email } : (params || {})

  try {
    // קריאה בלבד → אפשר לנסות שוב אם נתקע; פעולה שכותבת נשלחת פעם אחת כדי שלא תירשם פעמיים
    const out = await callGas(action, sent, { tries: READS.has(action) ? 3 : 1 })
    return res.status(200).json(out)
  } catch (e) {
    return res.status(502).json({ ok: false, error: e instanceof SyntaxError ? 'הגיליון לא ענה כמו שצריך' : 'אין חיבור לגיליון, נסה שוב' })
  }
}
