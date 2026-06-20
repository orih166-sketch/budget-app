import { useState } from 'react'

const LS_KEY = 'budget_investments'

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? [] }
  catch { return [] }
}

function persist(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

export function useInvestments() {
  const [investments, setInvestments] = useState(load)

  function save(next) {
    setInvestments(next)
    persist(next)
  }

  function addInvestment(inv) {
    setInvestments(prev => {
      const next = [{ ...inv, id: 'inv' + Date.now() }, ...prev]
      persist(next)
      return next
    })
  }

  function updateInvestment(id, data) {
    setInvestments(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...data } : i)
      persist(next)
      return next
    })
  }

  function deleteInvestment(id) {
    setInvestments(prev => {
      const next = prev.filter(i => i.id !== id)
      persist(next)
      return next
    })
  }

  return { investments, addInvestment, updateInvestment, deleteInvestment }
}
