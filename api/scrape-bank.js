import chromium from '@sparticuz/chromium-min'
import { createScraper, CompanyTypes } from 'israeli-bank-scrapers'
import { createClient } from '@supabase/supabase-js'

const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar'

export const config = { maxDuration: 300 }

const BANK_MAP = {
  // Banks
  discount:   CompanyTypes.discount,
  leumi:      CompanyTypes.leumi,
  hapoalim:   CompanyTypes.hapoalim,
  mizrahi:    CompanyTypes.mizrahi,
  mercantile: CompanyTypes.mercantile,
  // Credit cards
  cal:        CompanyTypes.cal,
  max:        CompanyTypes.max,
  isracard:   CompanyTypes.isracard,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { bank = 'discount', credentials = {}, startDate, householdId, authToken } = req.body || {}
  const { id, password, username, num } = credentials

  if (!householdId || !authToken) {
    return res.status(400).json({ error: 'חסרים פרטים' })
  }

  const companyType = BANK_MAP[bank]
  if (!companyType) {
    return res.status(400).json({ error: `בנק לא נתמך: ${bank}` })
  }

  const supabaseUrl = process.env.SUPABASE_URL  || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase env vars not configured on server' })
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  })

  try {
    const executablePath = await chromium.executablePath(CHROMIUM_URL)

    const scrapeFrom = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const scraper = createScraper({
      companyId: companyType,
      startDate: scrapeFrom,
      executablePath,
      args: [
        ...chromium.args,
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--disable-infobars',
      ],
      showBrowser: false,
      verbose: false,
    })

    // Each bank uses different credential field names
    const bankCreds = buildCreds(bank, { id, password, username, num })
    const result = await scraper.scrape(bankCreds)

    if (!result.success) {
      const errMsg = typeof result.errorMessage === 'string'
        ? result.errorMessage
        : result.errorMessage?.message ?? JSON.stringify(result.errorMessage) ?? 'כניסה נכשלה'
      console.error('scrape-bank failed:', bank, errMsg, 'type:', result.errorType)
      return res.status(401).json({ error: errMsg, errorType: result.errorType })
    }

    const { data: fRow } = await supabase
      .from('transactions').select('family_id').not('family_id', 'is', null).limit(1).maybeSingle()
    const familyId = fRow?.family_id ?? null

    const txns = result.accounts.flatMap(account =>
      (account.txns || [])
        .filter(t => t.status !== 'pending')
        .map(t => ({
          household_id: householdId,
          ...(familyId ? { family_id: familyId } : {}),
          date: t.date.substring(0, 10),
          description: t.description || t.memo || '',
          amount: Math.abs(t.chargedAmount),
          type: t.chargedAmount < 0 ? 'expense' : 'income',
          category_id: 'other',
          member: 'family',
          external_id: `${bank}_${account.accountNumber}_${t.identifier ?? `${t.date}_${t.chargedAmount}`}`,
        }))
    )

    if (txns.length === 0) {
      return res.status(200).json({ success: true, added: 0, total: 0, accounts: [] })
    }

    const { error, count } = await supabase
      .from('transactions')
      .upsert(txns, { onConflict: 'external_id', ignoreDuplicates: true, count: 'exact' })

    if (error) throw error

    return res.status(200).json({
      success: true,
      added: count ?? txns.length,
      total: txns.length,
      accounts: result.accounts.map(a => ({ number: a.accountNumber, txns: (a.txns || []).length })),
    })
  } catch (err) {
    console.error('scrape-bank error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

function buildCreds(bank, { id, password, username }) {
  switch (bank) {
    case 'hapoalim':
      return { userCode: username || id, password }
    case 'leumi':
    case 'cal':
    case 'max':
      return { username: username || id, password }
    case 'mizrahi':
    case 'mercantile':
    case 'isracard':
      return { id, password }
    default: // discount
      return { id, password }
  }
}
