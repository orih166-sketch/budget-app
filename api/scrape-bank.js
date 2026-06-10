import chromium from '@sparticuz/chromium-min'
import { createScraper, CompanyTypes } from 'israeli-bank-scrapers'
import { createClient } from '@supabase/supabase-js'

// Chromium binary compatible with puppeteer v24 / Chrome 131
const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar'

export const config = { maxDuration: 300 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { id, password, startDate, householdId, authToken } = req.body || {}
  if (!id || !password || !householdId || !authToken) {
    return res.status(400).json({ error: 'חסרים פרטים' })
  }

  // Authenticated Supabase client — RLS applies, no service key needed
  // Use server-side env var names (VITE_ prefix is build-time only, not available at runtime)
  const supabaseUrl  = process.env.SUPABASE_URL  || process.env.VITE_SUPABASE_URL
  const supabaseKey  = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase env vars not configured on server' })
  }
  const supabase = createClient(
    supabaseUrl,
    supabaseKey,
    { global: { headers: { Authorization: `Bearer ${authToken}` } } }
  )

  try {
    const executablePath = await chromium.executablePath(CHROMIUM_URL)

    const scrapeFrom = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const scraper = createScraper({
      companyId: CompanyTypes.discount,
      startDate: scrapeFrom,
      executablePath,
      args: [
        ...chromium.args,
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      showBrowser: false,
      verbose: false,
    })

    const result = await scraper.scrape({ id, password })

    // Credentials no longer needed
    if (!result.success) {
      return res.status(401).json({
        error: result.errorMessage || 'כניסה לבנק דיסקונט נכשלה',
      })
    }

    // Reuse an existing family_id (legacy NOT NULL constraint)
    const { data: fRow } = await supabase
      .from('transactions')
      .select('family_id')
      .not('family_id', 'is', null)
      .limit(1)
      .maybeSingle()
    const familyId = fRow?.family_id ?? null

    const txns = result.accounts.flatMap(account =>
      (account.txns || [])
        .filter(t => t.status !== 'pending')
        .map(t => {
          const externalId = `discount_${account.accountNumber}_${
            t.identifier ?? `${t.date}_${t.chargedAmount}`
          }`
          return {
            household_id: householdId,
            ...(familyId ? { family_id: familyId } : {}),
            date: t.date.substring(0, 10),
            description: t.description || t.memo || '',
            amount: Math.abs(t.chargedAmount),
            type: t.chargedAmount < 0 ? 'expense' : 'income',
            category_id: 'other',
            member: 'family',
            external_id: externalId,
          }
        })
    )

    if (txns.length === 0) {
      return res.status(200).json({ success: true, added: 0, total: 0 })
    }

    // Upsert — ignore duplicates by external_id
    const { error, count } = await supabase
      .from('transactions')
      .upsert(txns, { onConflict: 'external_id', ignoreDuplicates: true, count: 'exact' })

    if (error) throw error

    return res.status(200).json({
      success: true,
      added: count ?? txns.length,
      total: txns.length,
      accounts: result.accounts.map(a => ({
        number: a.accountNumber,
        txns: (a.txns || []).length,
      })),
    })
  } catch (err) {
    console.error('scrape-bank:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
