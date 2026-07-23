/**
 * db.js — Supabase upsert for WhatsApp bot imports
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

/**
 * Builds a stable external_id for dedup.
 * Format: wa_<date>_<amount>_<first20charsOfDesc>
 */
function makeExternalId(txn) {
  const slug = txn.desc.replace(/\s+/g, '_').replace(/[^\w֐-׿]/g, '').slice(0, 20)
  return `wa_${txn.date}_${txn.amount}_${slug}`
}

/**
 * @param {Array<{date,desc,amount,type}>} txns
 * @param {string} householdId
 * @returns {Promise<{added: number, total: number}>}
 */
export async function upsertTransactions(txns, householdId) {
  if (!txns.length) return { added: 0, total: 0 }

  const rows = txns.map(t => ({
    family_id: householdId,
    date: t.date,
    description: t.desc,
    amount: t.amount,
    type: t.type,
    source: 'whatsapp',
    external_id: makeExternalId(t),
  }))

  const { error, count } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'external_id', ignoreDuplicates: true, count: 'exact' })

  if (error) throw error
  return { added: count ?? 0, total: txns.length }
}
