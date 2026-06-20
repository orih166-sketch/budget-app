import { useState } from 'react'

const LS_KEY = 'budget_recurring_v1'

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? [] }
  catch { return [] }
}
function persist(d) { localStorage.setItem(LS_KEY, JSON.stringify(d)) }

export const INTERVAL_LABELS = {
  weekly:  'שבועי',
  monthly: 'חודשי',
  yearly:  'שנתי',
}

export function useRecurring() {
  const [rules, setRules] = useState(load)

  function addRule(rule) {
    setRules(prev => {
      const next = [{ ...rule, id: 'rec_' + Date.now() }, ...prev]
      persist(next)
      return next
    })
  }

  function deleteRule(id) {
    setRules(prev => {
      const next = prev.filter(r => r.id !== id)
      persist(next)
      return next
    })
  }

  function updateRule(id, changes) {
    setRules(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...changes } : r)
      persist(next)
      return next
    })
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
