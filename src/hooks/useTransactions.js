import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useHousehold } from '../context/HouseholdContext.jsx'

export function useTransactions() {
  const { household } = useHousehold()
  const [transactions, setTransactions] = useState([])
  const [expectedIncome, setExpectedIncomeState] = useState(0)

  useEffect(() => {
    if (!household) return
    loadTransactions()
  }, [household?.id])

  async function loadTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })

    if (error) { console.error('loadTransactions:', error); return }
    setTransactions((data || []).map(mapRow))
  }

  async function addTransaction(tx) {
    if (!household) return
    const tempId = 'tmp_' + Date.now()
    setTransactions(prev => [{ ...tx, id: tempId }, ...prev])

    const { data: { user: authUser } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        household_id: household.id,
        date: tx.date,
        description: tx.desc,
        amount: tx.amount,
        type: tx.type,
        category_id: tx.category,
        user_id: authUser?.id ?? null,
        member: tx.user || 'family',
      })
      .select()
      .single()

    if (error) {
      console.error('addTransaction:', error)
      alert('שגיאה בהוספת עסקה: ' + error.message)
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
    if (changes.user !== undefined)     patch.user_id = changes.user

    const { error } = await supabase.from('transactions').update(patch).eq('id', id)
    if (error) { console.error('updateTransaction:', error); setTransactions(snap) }
  }

  async function deleteTransaction(id) {
    const snap = transactions
    setTransactions(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { console.error('deleteTransaction:', error); setTransactions(snap) }
  }

  function setExpectedIncome(amount) { setExpectedIncomeState(amount) }
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
    user: t.member || t.user_id || 'family',
  }
}
