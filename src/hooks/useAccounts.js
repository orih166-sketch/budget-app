import { useState } from 'react'

const LS_KEY = 'budget_accounts'

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? [] }
  catch { return [] }
}

function persist(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

export function useAccounts() {
  const [accounts, setAccounts] = useState(load)

  function addAccount(acc) {
    setAccounts(prev => {
      const next = [{ ...acc, id: 'acc' + Date.now() }, ...prev]
      persist(next)
      return next
    })
  }

  function updateAccount(id, data) {
    setAccounts(prev => {
      const next = prev.map(a => a.id === id ? { ...a, ...data } : a)
      persist(next)
      return next
    })
  }

  function deleteAccount(id) {
    setAccounts(prev => {
      const next = prev.filter(a => a.id !== id)
      persist(next)
      return next
    })
  }

  const assets      = accounts.filter(a => a.type === 'asset')
  const liabilities = accounts.filter(a => a.type === 'liability')
  const totalAssets = assets.reduce((s, a) => s + (Number(a.balance) || 0), 0)
  const totalLiab   = liabilities.reduce((s, a) => s + (Number(a.balance) || 0), 0)
  const netWorth    = totalAssets - totalLiab

  return { accounts, assets, liabilities, totalAssets, totalLiab, netWorth, addAccount, updateAccount, deleteAccount }
}
