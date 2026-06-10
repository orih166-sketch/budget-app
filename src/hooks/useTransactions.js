import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useHousehold } from '../context/HouseholdContext.jsx'

export function useTransactions() {
  const { household } = useHousehold()
  const [transactions, setTransactions] = useState([])
  const [expectedIncome, setExpectedIncomeState] = useState(0)
  const [legacyFamilyId, setLegacyFamilyId] = useState(null)
  const [txError, setTxError] = useState(null)

  // Load expected income from localStorage (household-specific)
  useEffect(() => {
    if (!household?.id) return
    const saved = localStorage.getItem(`expected_income_${household.id}`)
    if (saved) setExpectedIncomeState(Number(saved))
  }, [household?.id])

  useEffect(() => {
    if (!household) return
    loadTransactions()
  }, [household?.id])

  async function loadTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('household_id', household.id)   // ← Fix 1: filter by household
      .order('date', { ascending: false })

    if (error) { console.error('loadTransactions:', error); return }
    const firstWithFamily = data?.find(t => t.family_id)
    if (firstWithFamily) setLegacyFamilyId(firstWithFamily.family_id)
    setTransactions((data || []).map(mapRow))
  }

  async function addTransaction(tx) {
    if (!household) return
    const tempId = 'tmp_' + Date.now()
    setTransactions(prev => [{ ...tx, id: tempId }, ...prev])
    setTxError(null)

    const { data: fRow } = await supabase
      .from('transactions').select('family_id').not('family_id', 'is', null).limit(1).single()
    const familyId = fRow?.family_id ?? legacyFamilyId

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        household_id: household.id,
        family_id: familyId,
        date: tx.date,
        description: tx.desc || '',
        amount: tx.amount,
        type: tx.type,
        category_id: tx.category,
        member: tx.user || 'family',
      })
      .select()
      .single()

    if (error) {
      console.error('addTransaction:', error)
      setTxError('שגיאה בהוספת עסקה: ' + error.message)
      setTransactions(prev => prev.filter(t => t.id !== tempId))
    } else {
      setTransactions(prev => prev.map(t => t.id === tempId ? mapRow(data) : t))
    }
  }

  async function updateTransaction(id, changes) {
    const snap = transactions
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))

    const patch = {}
    if (changes.desc !== undefined)     patch.description = changes.desc
    if (changes.amount !== undefined)   patch.amount = changes.amount
    if (changes.type !== undefined)     patch.type = changes.type
    if (changes.category !== undefined) patch.category_id = changes.category
    if (changes.date !== undefined)     patch.date = changes.date
    if (changes.user !== undefined)     patch.member = changes.user  // ← Fix 3: member not user_id

    const { error } = await supabase.from('transactions').update(patch).eq('id', id)
    if (error) {
      console.error('updateTransaction:', error)
      setTxError('שגיאה בעדכון עסקה')
      setTransactions(snap)
    }
  }

  async function deleteTransaction(id) {
    const snap = transactions
    setTransactions(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      console.error('deleteTransaction:', error)
      setTxError('שגיאה במחיקת עסקה')
      setTransactions(snap)
    }
  }

  // Fix 2: persist expected income to localStorage
  function setExpectedIncome(amount) {
    const val = Math.max(0, Number(amount) || 0)
    setExpectedIncomeState(val)
    if (household?.id) localStorage.setItem(`expected_income_${household.id}`, val)
  }

  function updateBudget() {}

  return {
    transactions,
    budget: {},
    expectedIncome,
    setExpectedIncome,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateBudget,
    txError,
    clearTxError: () => setTxError(null),
  }
}

function mapRow(t) {
  return {
    id: t.id,
    date: t.date,
    desc: t.description,
    amount: t.amount,
    type: t.type,
    category: t.category_id,
    user: t.member || 'family',
  }
}
