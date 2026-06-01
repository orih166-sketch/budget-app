import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_BUDGET } from '../data.js'
import { supabase } from '../lib/supabase.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_BUDGET       = 'budget_plan'
const LS_EXPECTED_INC = 'budget_expected_income'
const FAMILY_ID       = '2ccdb3f5-9750-40a8-ae01-e00adbadd32f'

// ─── localStorage helpers ─────────────────────────────────────────────────────
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}
function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Map Supabase row → app transaction ──────────────────────────────────────
function rowToTx(row) {
  return {
    id:       row.id,
    date:     row.date,
    desc:     row.description,
    category: row.category_id,
    amount:   Number(row.amount),
    type:     row.type,
    user:     row.user_id === 'a1000000-0000-0000-0000-000000000001' ? 'uri'
            : row.user_id === 'a2000000-0000-0000-0000-000000000002' ? 'afek'
            : 'family',
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTransactions() {
  const [transactions, setTransactions]          = useState([])
  const [loading, setLoading]                    = useState(true)
  const [budget, setBudget]                      = useState(() => load(LS_BUDGET, DEFAULT_BUDGET))
  const [expectedIncome, setExpectedIncomeState] = useState(() => load(LS_EXPECTED_INC, 1690))

  // ── Fetch all transactions from Supabase ──────────────────────────────────
  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('family_id', FAMILY_ID)
        .order('date', { ascending: false })

      if (error) {
        console.error('[Supabase] fetch error:', error)
      } else {
        setTransactions(data.map(rowToTx))
      }
      setLoading(false)
    }

    fetchTransactions()
  }, [])

  // ── Optimistic add ────────────────────────────────────────────────────────
  async function addTransaction(tx) {
    const userId = tx.user === 'uri'  ? 'a1000000-0000-0000-0000-000000000001'
                 : tx.user === 'afek' ? 'a2000000-0000-0000-0000-000000000002'
                 : null

    // Optimistic update
    const tempId = 't' + Date.now()
    const tempTx = { ...tx, id: tempId }
    setTransactions(prev => [tempTx, ...prev])

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        family_id:   FAMILY_ID,
        user_id:     userId,
        date:        tx.date,
        description: tx.desc,
        amount:      tx.amount,
        type:        tx.type,
        category_id: tx.category,
        source:      'manual',
      })
      .select()
      .single()

    if (error) {
      console.error('[Supabase] addTransaction failed:', error)
      setTransactions(prev => prev.filter(t => t.id !== tempId)) // rollback
    } else {
      // Replace temp with real row
      setTransactions(prev => prev.map(t => t.id === tempId ? rowToTx(data) : t))
    }
  }

  // ── Optimistic update ─────────────────────────────────────────────────────
  async function updateTransaction(id, changes) {
    const prev = transactions
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))

    const userId = changes.user === 'uri'  ? 'a1000000-0000-0000-0000-000000000001'
                 : changes.user === 'afek' ? 'a2000000-0000-0000-0000-000000000002'
                 : null

    const { error } = await supabase
      .from('transactions')
      .update({
        date:        changes.date,
        description: changes.desc,
        amount:      changes.amount,
        category_id: changes.category,
        user_id:     userId,
      })
      .eq('id', id)

    if (error) {
      console.error('[Supabase] updateTransaction failed:', error)
      setTransactions(prev) // rollback
    }
  }

  // ── Optimistic delete ─────────────────────────────────────────────────────
  async function deleteTransaction(id) {
    const prev = transactions
    setTransactions(p => p.filter(t => t.id !== id))

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Supabase] deleteTransaction failed:', error)
      setTransactions(prev) // rollback
    }
  }

  // ── Budget (stays in localStorage) ───────────────────────────────────────
  function updateBudget(next) {
    setBudget(next)
    persist(LS_BUDGET, next)
  }

  function setExpectedIncome(val) {
    const n = Number(val) || 0
    setExpectedIncomeState(n)
    persist(LS_EXPECTED_INC, n)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getMonthTx(month, year, user = 'family') {
    return transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00')
      return (
        d.getMonth()    === month &&
        d.getFullYear() === year  &&
        (user === 'family' || t.user === user)
      )
    })
  }

  function getSummary(filteredTxs) {
    return filteredTxs.reduce((acc, t) => {
      if (t.type === 'expense') acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {})
  }

  return {
    transactions,
    loading,
    budget,
    expectedIncome,
    setExpectedIncome,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateBudget,
    getMonthTx,
    getSummary,
  }
}
