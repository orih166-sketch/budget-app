// Migration: Google Sheets → Supabase
// Run: node scripts/migrate-sheets-to-supabase.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://tiyaxhovletymvsgqvgh.supabase.co'
const SUPABASE_KEY     = 'sb_publishable_vyzPFG1BGBejn0M_pz06MQ_eGnk_cp9'
const SHEETS_URL       = 'https://script.google.com/macros/s/AKfycbwbqRHDmNg2FdOgJlqPHLg8Xt0dXDf35mHJYXfSKgSOw2Z_a_iXksX4kbi7Qyx1CrKj/exec'
const FAMILY_ID        = '2ccdb3f5-9750-40a8-ae01-e00adbadd32f'
const USER_URI         = 'a1000000-0000-0000-0000-000000000001'
const USER_AFEK        = 'a2000000-0000-0000-0000-000000000002'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function senderToUserId(sender) {
  if (!sender) return null
  const s = sender.toLowerCase()
  if (s.includes('אורי') || s.includes('uri') || s.includes('ori')) return USER_URI
  if (s.includes('אפק') || s.includes('afek')) return USER_AFEK
  return null
}

// Normalise description for dedup comparison
function normDesc(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

async function main() {
  console.log('📥 Fetching Google Sheets data…')
  const res = await fetch(SHEETS_URL, { redirect: 'follow' })
  const json = await res.json()
  const sheetsRows = json.data
  console.log(`   Got ${sheetsRows.length} rows from Sheets`)

  // ── Dedup within Sheets: prefer 's' entries over 'm' entries ──────────────
  // Key: date + amount + normalized description
  const deduped = new Map()
  for (const row of sheetsRows) {
    const key = `${row.date}|${row.amount}|${normDesc(row.description)}`
    const existing = deduped.get(key)
    if (!existing) {
      deduped.set(key, row)
    } else {
      // Prefer the 's' entry (has user attribution from bank bot)
      if (row.id.startsWith('s') && existing.id.startsWith('m')) {
        deduped.set(key, row)
      }
    }
  }
  const uniqueRows = [...deduped.values()]
  console.log(`   After dedup: ${uniqueRows.length} unique transactions`)

  // ── Fetch existing Supabase transactions ──────────────────────────────────
  console.log('📡 Fetching existing Supabase data…')
  const { data: existing, error: fetchErr } = await supabase
    .from('transactions')
    .select('date, amount, description')
    .eq('family_id', FAMILY_ID)

  if (fetchErr) {
    console.error('❌ Failed to fetch Supabase data:', fetchErr)
    process.exit(1)
  }
  console.log(`   ${existing.length} transactions already in Supabase`)

  const existingKeys = new Set(
    existing.map(r => `${r.date}|${r.amount}|${normDesc(r.description)}`)
  )

  // ── Identify rows to import ───────────────────────────────────────────────
  const toImport = uniqueRows.filter(row => {
    const key = `${row.date}|${row.amount}|${normDesc(row.description)}`
    return !existingKeys.has(key)
  })
  console.log(`\n✅ ${toImport.length} new rows to import (${uniqueRows.length - toImport.length} already exist)`)

  if (toImport.length === 0) {
    console.log('Nothing to do.')
    return
  }

  // ── Build Supabase rows ───────────────────────────────────────────────────
  const supabaseRows = toImport.map(row => ({
    family_id:   FAMILY_ID,
    user_id:     senderToUserId(row.sender),
    date:        row.date,
    description: row.description || '',
    amount:      Number(row.amount),
    type:        row.type || 'expense',
    category_id: row.category || 'other',
    source:      'sheets_import',
  }))

  // ── Insert in batches of 100 ──────────────────────────────────────────────
  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < supabaseRows.length; i += BATCH) {
    const batch = supabaseRows.slice(i, i + BATCH)
    const { error } = await supabase.from('transactions').insert(batch)
    if (error) {
      console.error(`❌ Batch ${i}–${i + BATCH} failed:`, error.message)
    } else {
      inserted += batch.length
      process.stdout.write(`\r   Inserted ${inserted}/${supabaseRows.length}…`)
    }
  }

  console.log(`\n🎉 Done! Imported ${inserted} transactions from Google Sheets to Supabase.`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
