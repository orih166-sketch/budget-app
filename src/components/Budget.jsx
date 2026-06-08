import { useState, useMemo, useEffect } from 'react'
import { CATEGORIES, MONTHS } from '../data.js'
import { useCategoryBudgets } from '../hooks/useCategoryBudgets.js'
import styles from './Budget.module.css'

const fmt = n => '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })

export default function Budget({ transactions, budget, onUpdateBudget, selectedMonth, selectedYear }) {
  const { budgets: categoryBudgets, setBudget } = useCategoryBudgets()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...budget })

  const monthTx = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && t.type === 'expense'
    }), [transactions, selectedMonth, selectedYear])

  const actual = useMemo(() => {
    const m = {}
    monthTx.forEach(t => { m[t.category] = (m[t.category] || 0) + t.amount })
    return m
  }, [monthTx])

  const totalBudget = Object.values(budget).reduce((a, v) => a + v, 0)
  const totalActual = Object.values(actual).reduce((a, v) => a + v, 0)

  function save() {
    const clean = {}
    Object.entries(draft).forEach(([k, v]) => {
      clean[k] = parseFloat(v) || 0
      setBudget(k, clean[k])
    })
    onUpdateBudget(clean)
    setEditing(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>תכנון תקציב — {MONTHS[selectedMonth]} {selectedYear}</h2>
          <p className={styles.sub}>מתוכנן: {fmt(totalBudget)} | בפועל: {fmt(totalActual)}</p>
        </div>
        <button className={styles.editBtn} onClick={() => editing ? save() : setEditing(true)}>
          {editing ? 'שמור' : 'ערוך'}
        </button>
      </div>

      <div className={styles.list}>
        {CATEGORIES.expenses.map(c => {
          const plan = budget[c.id] || 0
          const done = actual[c.id] || 0
          const pct  = plan > 0 ? Math.min(100, Math.round((done / plan) * 100)) : (done > 0 ? 100 : 0)
          const over = done > plan && plan > 0
          return (
            <div key={c.id} className={`${styles.card} ${over ? styles.over : ''}`}>
              <div className={styles.cardTop}>
                <span className={styles.icon}>{c.icon}</span>
                <span className={styles.label}>{c.label}</span>
                <div className={styles.amounts}>
                  {editing ? (
                    <input
                      className={styles.amtInput}
                      type="number"
                      value={draft[c.id] ?? plan}
                      onChange={e => setDraft(d => ({ ...d, [c.id]: e.target.value }))}
                    />
                  ) : (
                    <span className={styles.plan}>{fmt(plan)}</span>
                  )}
                  <span className={`${styles.actual} ${over ? styles.overText : ''}`}>{fmt(done)}</span>
                </div>
              </div>
              <div className={styles.barWrap}>
                <div
                  className={styles.bar}
                  style={{ width:`${pct}%`, background: over ? 'var(--c-red)' : pct > 75 ? 'var(--c-yellow)' : c.color }}
                />
              </div>
              <div className={styles.pctRow}>
                <span className={`${styles.pct} ${over ? styles.overText : ''}`}>{pct}% נוצל</span>
                {over && <span className={styles.overBadge}>חריגה {fmt(done - plan)}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
