import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { pdfBase64, householdId, authToken } = req.body || {}
  if (!pdfBase64 || !householdId || !authToken) {
    return res.status(400).json({ error: 'חסרים פרטים' })
  }

  const supabaseUrl = process.env.SUPABASE_URL  || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase env vars not configured' })
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  })

  try {
    const buffer = Buffer.from(pdfBase64, 'base64')
    const data = await pdfParse(buffer, { max: 0 })
    const txns = parseDiscountBankStatement(data.text)

    if (txns.length === 0) {
      return res.status(200).json({ success: true, added: 0, total: 0, txns: [] })
    }

    // Get family_id for legacy constraint
    const { data: fRow } = await supabase
      .from('transactions').select('family_id').not('family_id','is',null).limit(1).maybeSingle()
    const familyId = fRow?.family_id ?? null

    const rows = txns.map((t, i) => ({
      household_id: householdId,
      ...(familyId ? { family_id: familyId } : {}),
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category_id: 'other',
      member: 'family',
      external_id: `pdf_discount_${t.date}_${t.ref || i}_${t.amount}`,
    }))

    const { error, count } = await supabase
      .from('transactions')
      .upsert(rows, { onConflict: 'external_id', ignoreDuplicates: true, count: 'exact' })

    if (error) throw error

    return res.status(200).json({
      success: true,
      added: count ?? rows.length,
      total: rows.length,
      preview: txns.slice(0, 5),
    })
  } catch (err) {
    console.error('import-pdf:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

// ── Discount Bank PDF Parser ──────────────────────────────────────────────
// The statement has lines like:
//   יתרה    חובה    זכות    אסמכתא    תיאור הפעולה    ערך    יום
// Amounts: negative = expense (חובה), positive = income (זכות)
// Dates: DD/MM format, year from section headers like "יוני 2025"

function parseDiscountBankStatement(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const txns = []

  let currentYear = new Date().getFullYear()
  let currentMonth = null

  const HEBREW_MONTHS = {
    'ינואר':1,'פברואר':2,'מרץ':3,'אפריל':4,'מאי':5,'יוני':6,
    'יולי':7,'אוגוסט':8,'ספטמבר':9,'אוקטובר':10,'נובמבר':11,'דצמבר':12,
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Strip LTR/RTL marks
    const clean = line.replace(/[‎‏‪-‮]/g, '')

    // Detect year from header like "יוני 2025" or "יולי 2026"
    for (const [heb, mon] of Object.entries(HEBREW_MONTHS)) {
      const m = clean.match(new RegExp(heb + '\\s+(\\d{4})'))
      if (m) {
        currentYear = parseInt(m[1])
        currentMonth = mon
        break
      }
    }

    // Look for date patterns DD/MM
    const dateMatch = clean.match(/(\d{1,2})\/(\d{1,2})/)
    if (!dateMatch) continue

    const day   = parseInt(dateMatch[1])
    const month = parseInt(dateMatch[2])
    if (day < 1 || day > 31 || month < 1 || month > 12) continue

    // Look for an amount in this line
    const amounts = [...clean.matchAll(/-?[\d,]+\.\d{2}/g)]
      .map(m => parseFloat(m[0].replace(/,/g, '')))
      .filter(n => !isNaN(n) && Math.abs(n) > 0 && Math.abs(n) < 10_000_000)

    // Skip balance-only rows (יתרה) — usually large round numbers
    if (amounts.length === 0) continue
    // Prefer the smallest absolute amount (transaction, not balance)
    const amount = amounts.reduce((a, b) => Math.abs(a) < Math.abs(b) ? a : b)

    // Skip if it looks like a balance (very large number with no description context)
    if (Math.abs(amount) > 500_000) continue

    // Find description: look backwards/forwards for Hebrew text near this line
    const desc = extractDescription(lines, i)

    // Build date string, considering year wrap (Dec→Jan)
    const y = month > (currentMonth ?? 12) ? currentYear - 1 : currentYear
    const dateStr = `${y}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`

    // Extract reference number
    const refMatch = clean.match(/\b(\d{4})\b/)
    const ref = refMatch ? refMatch[1] : ''

    txns.push({
      date: dateStr,
      description: desc,
      amount: Math.abs(amount),
      type: amount < 0 ? 'expense' : 'income',
      ref,
    })
  }

  // Deduplicate by date+amount+desc
  const seen = new Set()
  return txns.filter(t => {
    const key = `${t.date}_${t.amount}_${t.description}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractDescription(lines, idx) {
  // Look at lines around idx for Hebrew description text
  const candidates = []
  for (let j = Math.max(0, idx - 2); j <= Math.min(lines.length - 1, idx + 2); j++) {
    const c = lines[j].replace(/[‎‏‪-‮]/g, '')
    // Hebrew text: contains Hebrew chars, not just numbers/dates
    if (/[֐-׿]/.test(c)) {
      // Remove numbers, dates, known noise
      const stripped = c
        .replace(/-?[\d,]+\.\d{2}/g, '')
        .replace(/\d{1,2}\/\d{1,2}/g, '')
        .replace(/\d{4}/g, '')
        .replace(/[ח\s]+$/, '')
        .trim()
      if (stripped.length > 2) candidates.push(stripped)
    }
  }
  return candidates[0] || 'עסקה מדוח בנק'
}
