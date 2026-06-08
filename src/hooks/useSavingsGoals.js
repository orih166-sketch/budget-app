import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useHousehold } from '../context/HouseholdContext.jsx'

function rowToGoal(row) {
  return {
    id:            row.id,
    name:          row.name,
    icon:          row.icon,
    targetAmount:  Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    targetDate:    row.target_date,
    color:         row.color,
  }
}

export function useSavingsGoals() {
  const { household } = useHousehold()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!household) return
    loadGoals()
  }, [household?.id])

  async function loadGoals() {
    setLoading(true)
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .order('created_at', { ascending: true })
    // RLS auto-filters to this household

    if (error) console.error('[Supabase] savings_goals:', error)
    else setGoals(data.map(rowToGoal))
    setLoading(false)
  }

  async function addGoal(goal) {
    if (!household) return
    const tempId = 'tmp_' + Date.now()
    setGoals(prev => [...prev, { ...goal, id: tempId }])

    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        household_id:   household.id,
        name:           goal.name,
        icon:           goal.icon,
        target_amount:  goal.targetAmount,
        current_amount: goal.currentAmount || 0,
        target_date:    goal.targetDate || null,
        color:          goal.color,
      })
      .select()
      .single()

    if (error) {
      console.error('[Supabase] addGoal:', error)
      setGoals(prev => prev.filter(g => g.id !== tempId))
    } else {
      setGoals(prev => prev.map(g => g.id === tempId ? rowToGoal(data) : g))
    }
  }

  async function updateGoal(id, changes) {
    const snap = goals
    setGoals(p => p.map(g => g.id === id ? { ...g, ...changes } : g))

    const patch = {}
    if (changes.name          !== undefined) patch.name           = changes.name
    if (changes.icon          !== undefined) patch.icon           = changes.icon
    if (changes.targetAmount  !== undefined) patch.target_amount  = changes.targetAmount
    if (changes.currentAmount !== undefined) patch.current_amount = changes.currentAmount
    if (changes.targetDate    !== undefined) patch.target_date    = changes.targetDate || null
    if (changes.color         !== undefined) patch.color          = changes.color

    const { error } = await supabase.from('savings_goals').update(patch).eq('id', id)
    if (error) { console.error('[Supabase] updateGoal:', error); setGoals(snap) }
  }

  async function depositToGoal(id, amount) {
    const goal = goals.find(g => g.id === id)
    if (!goal) return
    const next = Math.min(goal.currentAmount + amount, goal.targetAmount)
    await updateGoal(id, { currentAmount: next })
  }

  async function deleteGoal(id) {
    const snap = goals
    setGoals(p => p.filter(g => g.id !== id))
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (error) { console.error('[Supabase] deleteGoal:', error); setGoals(snap) }
  }

  return { goals, loading, addGoal, updateGoal, depositToGoal, deleteGoal }
}
