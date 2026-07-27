import { useState, useMemo } from 'react'
import { MONTHS } from '../data.js'
import { BUDGET_CATEGORIES, CATEGORY_ID_MAP } from '../data/household.js'
import { useCategoryBudgets } from '../hooks/useCategoryBudgets.js'
import styles from './Budget.module.css'

const fmt  = n => '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })
const fmtK = v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v

export default function Budget({ transactions, budget, onUpdateBudget, selectedMonth, selectedYear }) {
  const { budgets: categoryBudgets, saveAllBudgets } = useCategoryBudgets()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})

  const monthTx = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && t.type === 'expense'
    }), [transactions, selectedMonth, selectedYear])

  // Map transaction category IDs → budget category IDs before summing
  const actual = useMemo(() => {
    const m = {}
    monthTx.forEach(t => {
      const mapped = CATEGORY_ID_MAP[t.category] || t.category
      m[mapped] = (m[mapped] || 0) + t.amount
    })
    return m
  }, [monthTx])

  const totalPlanned = BUDGET_CATEGORIES.reduce((a, c) => a + (categoryBudgets[c.id] ?? 0), 0)
  const totalActual  = Object.values(actual).reduce((a, v) => a + v, 0)
  const totalRemain  = totalPlanned - totalActual
  const overallPct   = totalPlanned > 0 ? Math.min(100, Math.round((totalActual / totalPlanned) * 100)) : 0
  const isOverall    = totalActual > totalPlanned && totalPlanned > 0

  function startEdit() {
    const d = {}
    BUDGET_CATEGORIES.forEach(c => { d[c.id] = categoryBudgets[c.id] ?? 0 })
    setDraft(d)
    setEditing(true)
  }

  function save() {
    const parsed = {}
    Object.entries(draft).forEach(([k, v]) => { parsed[k] = parseFloat(v) || 0 })
    saveAllBudgets(parsed)
    setEditing(false)
  }

  return (
    <div className={styles.wrap}>

      {/* ── Hero ── */}
      <div className={`${styles.hero} ${isOverall ? styles.heroOver : ''}`}>
        <div className={styles.heroHeader}>
          <div>
            <div className={styles.heroGreet}>תכנון תקציב</div>
            <div className={styles.heroMonth}>{MONTHS[selectedMonth]} {selectedYear}</div>
          </div>
          <div className={styles.heroBtns}>
            {editing && (
              <button className={styles.heroCancelBtn} onClick={() => setEditing(false)}>ביטול</button>
            )}
            <button className={styles.heroEditBtn} onClick={editing ? save : startEdit}>
              {editing ? 'שמור ✓' : 'ערוך'}
            </button>
          </div>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLbl}>מתוכנן</div>
            <div className={`${styles.heroStatVal} ${styles.gold}`}>{fmt(totalPlanned)}</div>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            <div className={styles.heroStatLbl}>בפועל</div>
            <div className={`${styles.heroStatVal} ${isOverall ? styles.red : styles.green}`}>{fmt(totalActual)}</div>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            <div className={styles.heroStatLbl}>{totalRemain >= 0 ? 'נותר' : 'חריגה'}</div>
            <div className={`${styles.heroStatVal} ${totalRemain >= 0 ? styles.green : styles.red}`}>{fmt(Math.abs(totalRemain))}</div>
          </div>
        </div>

        <div className={styles.heroBarWrap}>
          <div
            className={`${styles.heroBar} ${isOverall ? styles.heroBarRed : overallPct > 80 ? styles.heroBarYellow : styles.heroBarGreen}`}
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <div className={styles.heroBarRow}>
          <span>0</span>
          <span>{overallPct}% נוצל</span>
          <span>{fmtK(totalPlanned)}</span>
        </div>
      </div>

      {/* ── Category list ── */}
      <div className={styles.list}>
        {BUDGET_CATEGORIES.map((c, i) => {
          const plan = categoryBudgets[c.id] ?? 0
          const done = actual[c.id] || 0
          const pct  = plan > 0 ? Math.min(100, Math.round((done / plan) * 100)) : (done > 0 ? 100 : 0)
          const over = done > plan && plan > 0
          const barColor = over ? '#ef4444' : pct > 80 ? '#f59e0b' : c.color

          return (
            <div
              key={c.id}
              className={`${styles.card} ${over ? styles.cardOver : ''} ${done === 0 && plan === 0 ? styles.cardEmpty : ''}`}
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div className={styles.cardAccent} style={{ background: c.color }} />

              <div className={styles.cardTop}>
                <div className={styles.iconWrap} style={{ background: c.color + '18' }}>
                  <span className={styles.icon}>{c.emoji}</span>
                </div>
                <div className={styles.cardInfo}>
                  <span className={styles.label}>{c.name}</span>
                  <div className={styles.barWrap}>
                    <div className={styles.bar} style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                </div>
                <div className={styles.amounts}>
                  {editing ? (
                    <input
                      className={styles.amtInput}
                      type="number"
                      value={draft[c.id] ?? plan}
                      onChange={e => setDraft(d => ({ ...d, [c.id]: e.target.value }))}
                    />
                  ) : (
                    <div className={styles.amtStack}>
                      <span className={styles.actual} style={{ color: over ? '#ef4444' : done > 0 ? 'var(--c-text)' : 'var(--c-text-2)' }}>
                        {fmt(done)}
                      </span>
                      <span className={styles.plan}>{plan > 0 ? `מתוך ${fmt(plan)}` : 'לא מוגדר'}</span>
                    </div>
                  )}
                </div>
              </div>

              {(over || pct > 0) && (
                <div className={styles.cardFooter}>
                  <span className={styles.pct} style={{ color: over ? '#ef4444' : pct > 80 ? '#f59e0b' : 'var(--c-text-2)' }}>
                    {pct}% נוצל
                  </span>
                  {over && (
                    <span className={styles.overBadge}>חריגה {fmt(done - plan)}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
