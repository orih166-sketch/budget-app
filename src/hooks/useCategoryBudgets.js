import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useHousehold } from '../context/HouseholdContext.jsx'

export function useCategoryBudgets() {
  const { household } = useHousehold()
  const [budgets, setBudgets] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!household) return
    loadBudgets()
  }, [household?.id])

  async function loadBudgets() {
    setLoading(true)
    const { data, error } = await supabase
      .from('category_budgets')
      .select('category_id, budget_amount')
    // RLS auto-filters to this household

    if (!error && data) {
      const map = {}
      data.forEach(row => { map[row.category_id] = row.budget_amount })
      setBudgets(map)
    }
    setLoading(false)
  }

  async function setBudget(categoryId, amount) {
    if (!household) return
    setBudgets(prev => ({ ...prev, [categoryId]: amount }))

    const { error } = await supabase
      .from('category_budgets')
      .upsert(
        { household_id: household.id, category_id: categoryId, budget_amount: amount },
        { onConflict: 'household_id,category_id' }
      )

    if (error) console.error('setBudget:', error)
  }

  async function deleteBudget(categoryId) {
    if (!household) return
    setBudgets(prev => { const next = { ...prev }; delete next[categoryId]; return next })

    const { error } = await supabase
      .from('category_budgets')
      .delete()
      .eq('household_id', household.id)
      .eq('category_id', categoryId)

    if (error) console.error('deleteBudget:', error)
  }

  return { budgets, loading, setBudget, deleteBudget }
}
