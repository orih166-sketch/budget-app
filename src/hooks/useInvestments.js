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
    save([{ ...inv, id: 'inv' + Date.now() }, ...investments])
  }

  function updateInvestment(id, data) {
    save(investments.map(i => i.id === id ? { ...i, ...data } : i))
  }

  function deleteInvestment(id) {
    save(investments.filter(i => i.id !== id))
  }

  return { investments, addInvestment, updateInvestment, deleteInvestment }
}
