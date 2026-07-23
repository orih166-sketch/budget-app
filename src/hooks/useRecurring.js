import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useHousehold } from '../context/HouseholdContext.jsx'

export const INTERVAL_LABELS = {
  weekly:  'שבועי',
  monthly: 'חודשי',
  yearly:  'שנתי',
}

// Map Supabase row → app rule
function fromRow(r) {
  return {
    id:          r.id,
    desc:        r.description,
    amount:      r.amount,
    type:        r.type,
    category:    r.category,
    user:        r.member || 'family',
    interval:    r.interval,
    startDate:   r.start_date,
    endDate:     r.end_date || null,
    dayOfMonth:  r.day_of_month,
  }
}

// Map app rule → Supabase row
function toRow(rule, householdId) {
  return {
    id:           rule.id,
    household_id: householdId,
    description:  rule.desc || '',
    amount:       rule.amount,
    type:         rule.type,
    category:     rule.category || null,
    member:       rule.user || 'family',
    interval:     rule.interval,
    start_date:   rule.startDate,
    end_date:     rule.endDate || null,
    day_of_month: rule.dayOfMonth || null,
  }
}

export function useRecurring() {
  const { household } = useHousehold()
  const [rules, setRules] = useState([])

  // Load from Supabase on mount
  useEffect(() => {
    if (!household?.id) return
    supabase
      .from('recurring_rules')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('useRecurring load:', error); return }
        setRules((data || []).map(fromRow))
      })
  }, [household?.id])

  async function addRule(rule) {
    if (!household?.id) return
    const newRule = { ...rule, id: 'rec_' + Date.now() }
    setRules(prev => [newRule, ...prev])   // optimistic

    const { error } = await supabase
      .from('recurring_rules')
      .insert(toRow(newRule, household.id))

    if (error) {
      console.error('addRule:', error)
      setRules(prev => prev.filter(r => r.id !== newRule.id))
    }
  }

  async function deleteRule(id) {
    setRules(prev => prev.filter(r => r.id !== id))   // optimistic

    const { error } = await supabase
      .from('recurring_rules')
      .delete()
      .eq('id', id)

    if (error) console.error('deleteRule:', error)
  }

  async function updateRule(id, changes) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))

    const patch = {}
    if (changes.desc !== undefined)        patch.description  = changes.desc
    if (changes.amount !== undefined)      patch.amount       = changes.amount
    if (changes.type !== undefined)        patch.type         = changes.type
    if (changes.category !== undefined)    patch.category     = changes.category
    if (changes.user !== undefined)        patch.member       = changes.user
    if (changes.interval !== undefined)    patch.interval     = changes.interval
    if (changes.startDate !== undefined)   patch.start_date   = changes.startDate
    if (changes.endDate !== undefined)     patch.end_date     = changes.endDate
    if (changes.dayOfMonth !== undefined)  patch.day_of_month = changes.dayOfMonth

    const { error } = await supabase
      .from('recurring_rules')
      .update(patch)
      .eq('id', id)

    if (error) console.error('updateRule:', error)
  }

  function instancesForMonth(year, month) {
    const out = []
    const monthEnd   = new Date(year, month + 1, 0)
    const monthStart = new Date(year, month, 1)

    for (const rule of rules) {
      const start = new Date(rule.startDate + 'T00:00:00')
      const end   = rule.endDate ? new Date(rule.endDate + 'T00:00:00') : null

      if (start > monthEnd) continue
      if (end && end < monthStart) continue

      if (rule.interval === 'monthly') {
        const day  = Math.min(rule.dayOfMonth || start.getDate(), monthEnd.getDate())
        const date = new Date(year, month, day)
        if (date >= start && (!end || date <= end)) out.push(makeInstance(rule, date))

      } else if (rule.interval === 'yearly') {
        if (start.getMonth() === month) {
          const day  = Math.min(start.getDate(), monthEnd.getDate())
          const date = new Date(year, month, day)
          if (date >= start && (!end || date <= end)) out.push(makeInstance(rule, date))
        }

      } else if (rule.interval === 'weekly') {
        const dow = start.getDay()
        for (let d = 1; d <= monthEnd.getDate(); d++) {
          const date = new Date(year, month, d)
          if (date.getDay() === dow && date >= start && (!end || date <= end)) {
            out.push(makeInstance(rule, date))
          }
        }
      }
    }
    return out
  }

  return { rules, addRule, deleteRule, updateRule, instancesForMonth }
}

function makeInstance(rule, date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const dateStr = `${y}-${m}-${d}`
  return {
    id:            `${rule.id}_${dateStr}`,
    recurringId:   rule.id,
    date:          dateStr,
    desc:          rule.desc,
    amount:        rule.amount,
    type:          rule.type,
    category:      rule.category,
    user:          rule.user,
    isRecurring:   true,
    intervalLabel: rule.interval,
  }
}
