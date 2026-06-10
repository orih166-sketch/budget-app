import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useHousehold } from '../context/HouseholdContext.jsx'

export function useCategoryBudgets() {
  const { household } = useHousehold()
  const [budgets, setBudgets] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!household?.id) return
    loadBudgets()
  }, [household?.id])

  async function loadBudgets() {
    setLoading(true)
    const { data, error } = await supabase
      .from('category_budgets')
      .select('category_id, budget_amount')
      .eq('household_id', household.id)

    if (error) {
      console.error('loadBudgets:', error)
    } else if (data) {
      const map = {}
      data.forEach(row => { map[row.category_id] = row.budget_amount })
      setBudgets(map)
    }
    setLoading(false)
  }

  async function setBudget(categoryId, amount) {
    if (!household?.id) return

    // Optimistic update
    const prev = budgets[categoryId]
    setBudgets(b => ({ ...b, [categoryId]: amount }))

    const { error } = await supabase
      .from('category_budgets')
      .upsert(
        { household_id: household.id, category_id: categoryId, budget_amount: amount },
        { onConflict: 'household_id,category_id' }
      )

    if (error) {
      console.error('setBudget:', error)
      // Rollback optimistic update
      setBudgets(b => ({ ...b, [categoryId]: prev }))
      return false
    }
    return true
  }

  async function saveAllBudgets(draftMap) {
    if (!household?.id) return

    // Optimistic update all at once
    setBudgets(draftMap)

    // Build upsert rows only for non-zero values
    const rows = Object.entries(draftMap)
      .filter(([, v]) => v > 0)
      .map(([categoryId, amount]) => ({
        household_id: household.id,
        category_id: categoryId,
        budget_amount: amount,
      }))

    if (rows.length === 0) return

    const { error } = await supabase
      .from('category_budgets')
      .upsert(rows, { onConflict: 'household_id,category_id' })

    if (error) {
      console.error('saveAllBudgets:', error)
      // Reload from DB on error
      await loadBudgets()
    }
  }

  async function deleteBudget(categoryId) {
    if (!household?.id) return
    setBudgets(prev => { const next = { ...prev }; delete next[categoryId]; return next })

    const { error } = await supabase
      .from('category_budgets')
      .delete()
      .eq('household_id', household.id)
      .eq('category_id', categoryId)

    if (error) {
      console.error('deleteBudget:', error)
      await loadBudgets()
    }
  }

  return { budgets, loading, setBudget, saveAllBudgets, deleteBudget }
}
