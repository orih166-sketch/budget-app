import { useState, useMemo, useEffect, useCallback } from 'react'
import { DEFAULT_BUDGET } from '../data.js'
import { CAT_MAP, mapSender } from '../config/transactionConfig.js'

// ─── Fix #3: No hardcoded URL — read from .env ───────────────────────────────
// Add to your .env file:  VITE_SHEETS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
const SHEETS_URL = import.meta.env.VITE_SHEETS_URL

const LS_TX             = 'budget_transactions'
const LS_BUDGET         = 'budget_plan'
const LS_EXPECTED_INC   = 'budget_expected_income'
const LS_VER            = 'budget_data_version'
const DATA_VER          = '3'
const DEFAULT_EXPECTED_INCOME = 1690

// ─── Storage helpers ─────────────────────────────────────────────────────────
function initStorage() {
  if (localStorage.getItem(LS_VER) !== DATA_VER) {
    localStorage.removeItem(LS_TX)
    localStorage.setItem(LS_VER, DATA_VER)
  }
}
initStorage()

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Sheets sync helper ───────────────────────────────────────────────────────
// Sends a single transaction action to the Google Apps Script endpoint.
// action: 'add' | 'update' | 'delete'
async function syncToSheets(action, tx) {
  if (!SHEETS_URL) return
  await fetch(SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      txId:        tx.id,
      date:        tx.date,      // ISO yyyy-mm-dd — no timezone manipulation
      description: tx.desc,
      category:    tx.category,
      amount:      tx.amount,
      type:        tx.type,
      sender:      tx.user,
    }),
  })
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTransactions() {
  const [transactions, setTransactions]     = useState(() => load(LS_TX, []))
  const [budget, setBudget]                 = useState(() => load(LS_BUDGET, DEFAULT_BUDGET))
  const [expectedIncome, setExpectedIncomeState] = useState(() => load(LS_EXPECTED_INC, DEFAULT_EXPECTED_INCOME))

  // ── Initial fetch from Google Sheets ────────────────────────────────────────
  useEffect(() => {
    if (!SHEETS_URL) return
    fetch(SHEETS_URL)
      .then(r => r.json())
      .then(res => {
        if (res.status !== 'ok' || !res.data?.length) return

        const sheetTxs = res.data.map(row => {
          // Fix #2: No timezone hack — use the date string as-is (yyyy-mm-dd)
          const dateStr = (row.date || '').includes('T')
            ? row.date.slice(0, 10)   // strip time portion from ISO string
            : (row.date || '')

          return {
            id:       row.id || ('s' + Date.now() + Math.random()),
            date:     dateStr,
            desc:     row.description || row.desc || '',
            category: CAT_MAP[row.category] || 'other',
            amount:   Number(row.amount) || 0,
            type:     row.type === 'income' ? 'income' : 'expense',
            user:     mapSender(row.sender),
          }
        })

        // Keep locally-added transactions not yet in Sheets
        const sheetIds  = new Set(sheetTxs.map(t => t.id))
        const manualOnly = load(LS_TX, []).filter(
          t => /^t\d{13}/.test(t.id) && !sheetIds.has(t.id)
        )

        const merged = [...sheetTxs, ...manualOnly]
          .sort((a, b) => (b.date > a.date ? 1 : -1))

        setTransactions(merged)
        persist(LS_TX, merged)
      })
      .catch(() => {})
  }, [])

  // ── Internal save (state + localStorage) ────────────────────────────────────
  const save = useCallback((txs) => {
    setTransactions(txs)
    persist(LS_TX, txs)
  }, [])

  // ── Fix #1: Optimistic UI + background Sheets sync with rollback ─────────────

  function addTransaction(tx) {
    const newTx  = { ...tx, id: 't' + Date.now() }
    const next   = [newTx, ...transactions]
    save(next)                                          // instant UI update

    syncToSheets('add', newTx).catch(err => {
      console.error('[Sheets] addTransaction failed:', err)
      // Rollback: remove the transaction we just added
      setTransactions(prev => {
        const rolled = prev.filter(t => t.id !== newTx.id)
        persist(LS_TX, rolled)
        return rolled
      })
    })
  }

  function updateTransaction(id, data) {
    const prev   = transactions
    const updated = transactions.map(t => t.id === id ? { ...t, ...data } : t)
    save(updated)                                       // instant UI update

    const updatedTx = updated.find(t => t.id === id)
    syncToSheets('update', updatedTx).catch(err => {
      console.error('[Sheets] updateTransaction failed:', err)
      save(prev)                                        // rollback to previous state
    })
  }

  function deleteTransaction(id) {
    const prev  = transactions
    const txToDelete = transactions.find(t => t.id === id)
    save(transactions.filter(t => t.id !== id))         // instant UI update

    if (txToDelete) {
      syncToSheets('delete', txToDelete).catch(err => {
        console.error('[Sheets] deleteTransaction failed:', err)
        save(prev)                                      // rollback
      })
    }
  }

  function updateBudget(next) {
    setBudget(next)
    persist(LS_BUDGET, next)
  }

  function setExpectedIncome(val) {
    const n = Number(val) || 0
    setExpectedIncomeState(n)
    persist(LS_EXPECTED_INC, n)
  }

  // ── Filtered month helper ────────────────────────────────────────────────────
  function getMonthTx(month, year, user = 'family') {
    return transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00') // force local date parse
      return (
        d.getMonth()    === month &&
        d.getFullYear() === year  &&
        (user === 'family' || t.user === user)
      )
    })
  }

  // ── Fix #4: summary operates on a PASSED-IN filtered array, not all data ────
  // Usage: const byCat = getSummary(getMonthTx(month, year, user))
  function getSummary(filteredTxs) {
    return filteredTxs.reduce((acc, t) => {
      if (t.type === 'expense') {
        acc[t.category] = (acc[t.category] || 0) + t.amount
      }
      return acc
    }, {})
  }

  return {
    transactions,
    budget,
    expectedIncome,
    setExpectedIncome,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateBudget,
    getMonthTx,
    getSummary,
  }
}
