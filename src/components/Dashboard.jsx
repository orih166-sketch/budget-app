import { useMemo, useState } from 'react'
import { CATEGORIES } from '../data.js'
import { BUDGET_CATEGORIES, CATEGORY_ID_MAP } from '../data/household.js'
import { useCategoryBudgets } from '../hooks/useCategoryBudgets.js'
import { formatMoney } from '../utils/formatMoney.js'
import { HOUSEHOLD } from '../data/household.js'
import AlertBanner from './AlertBanner.jsx'
import styles from './Dashboard.module.css'

const fmt = n => formatMoney(n)
const catMeta = id => {
  const mapped = CATEGORY_ID_MAP[id] || id
  const fromBudget = BUDGET_CATEGORIES.find(c => c.id === mapped)
  if (fromBudget) return fromBudget
  const fromData = [...CATEGORIES.expenses, ...CATEGORIES.income].find(c => c.id === id)
  if (fromData) return { id, name: fromData.label, emoji: fromData.icon, isFixed: false }
  return { id, name: id, emoji: '📦', isFixed: false }
}

export default function Dashboard({
  transactions,
  budget,
  selectedMonth,
  selectedYear,
  selectedUser = 'family',
  expectedIncome = 0,
  netWorth = 0,
  totalAssets = 0,
  totalLiab = 0,
  alertCount = 0,
}) {
  const { budgets: categoryBudgets } = useCategoryBudgets()
  const [okCollapsed, setOkCollapsed] = useState(true)
  const [alertToggles, setAlertToggles] = useState({})

  const monthTx = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
        && (selectedUser === 'family' || t.user === selectedUser)
    }), [transactions, selectedMonth, selectedYear, selectedUser])

  const income = useMemo(() => monthTx.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0), [monthTx])
  const expenses = useMemo(() => monthTx.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0), [monthTx])
  const plannedIncome = expectedIncome || HOUSEHOLD.totalIncome
  const remaining = plannedIncome - expenses
  const savingsPct = plannedIncome > 0 ? Math.round((remaining / plannedIncome) * 100) : 0

  const isCurrentMonth = selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear()
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const dayOfMonth = isCurrentMonth ? new Date().getDate() : daysInMonth
  const daysLeft = Math.max(1, daysInMonth - dayOfMonth + 1)

  const variableCategories = BUDGET_CATEGORIES.filter(c => !c.isFixed)
  const variablePlanned = variableCategories.reduce((a, c) => a + (categoryBudgets[c.id] ?? budget[c.id] ?? c.default), 0)
  const variableActual = useMemo(() => {
    let total = 0
    monthTx.filter(t => t.type === 'expense').forEach(t => {
      const mapped = CATEGORY_ID_MAP[t.category] || t.category
      const meta = BUDGET_CATEGORIES.find(c => c.id === mapped)
      if (meta && !meta.isFixed) total += t.amount
    })
    return total
  }, [monthTx])

  const utilizationPct = variablePlanned > 0 ? Math.min(100, Math.round((variableActual / variablePlanned) * 100)) : 0

  const categoryStats = useMemo(() => {
    const actual = {}
    monthTx.filter(t => t.type === 'expense').forEach(t => {
      const mapped = CATEGORY_ID_MAP[t.category] || t.category
      actual[mapped] = (actual[mapped] || 0) + t.amount
    })

    return BUDGET_CATEGORIES.filter(c => !c.isFixed).map(c => {
      const planned = categoryBudgets[c.id] ?? budget[c.id] ?? c.default
      const spent = actual[c.id] || 0
      const pct = planned > 0 ? Math.round((spent / planned) * 100) : 0
      const diff = planned - spent
      let status = 'ok'
      if (spent > planned && planned > 0) status = 'over'
      else if (pct >= 85) status = 'warn'
      return { ...c, planned, spent, pct, diff, status }
    }).filter(c => c.planned > 0 || c.spent > 0)
  }, [monthTx, categoryBudgets, budget])

  const over = categoryStats.filter(c => c.status === 'over')
  const warn = categoryStats.filter(c => c.status === 'warn')
  const ok = categoryStats.filter(c => c.status === 'ok')

  const alerts = useMemo(() => over.map(c => ({
    id: c.id,
    severity: 'critical',
    message: `${c.emoji} ${c.name}: חרגת ב-${fmt(c.spent - c.planned)}`,
  })), [over])

  function toggleAlert(id) {
    setAlertToggles(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function CategoryRow({ c }) {
    const isOver = c.status === 'over'
    const isWarn = c.status === 'warn'
    return (
      <div className={styles.catRow}>
        <div className={styles.catTop}>
          <span className={`${styles.catDot} ${isOver ? 'dot-red' : isWarn ? 'dot-amber' : ''}`} style={!isOver && !isWarn ? { background: 'var(--green)' } : {}} />
          <span className={styles.catName}>{c.emoji} {c.name}</span>
          <span className={styles.catAmount} dir="ltr">{fmt(c.spent)} / {fmt(c.planned)}</span>
          <button type="button" className={styles.bellBtn} onClick={() => toggleAlert(c.id)}>
            {alertToggles[c.id] !== false ? '🔔' : '🔕'}
          </button>
        </div>
        <div className={styles.catBarWrap}>
          <div
            className={styles.catBarFill}
            style={{
              width: `${Math.min(100, c.pct)}%`,
              background: isOver ? 'var(--red)' : isWarn ? 'var(--amber)' : 'var(--green)',
            }}
          />
        </div>
        <div className={styles.catPill}>
          {isOver
            ? `⚠️ חרגת ב-${fmt(c.spent - c.planned)}`
            : `נותר ${fmt(c.diff)} · ${100 - c.pct}%`}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <AlertBanner alerts={alerts.length ? alerts : []} />

      {/* Net worth strip */}
      <div className={styles.netStrip}>
        <div className={styles.netCol}>
          <div className={styles.netLabel}>שווי נקי משפחתי</div>
          <div className={styles.netVal} dir="ltr">{fmt(netWorth || totalAssets - totalLiab)}</div>
          <div className={styles.netSub} dir="ltr">↑ +{fmt(HOUSEHOLD.savingsMonthly)} החודש</div>
        </div>
        <div className={styles.netDivider} />
        <div className={styles.netCol}>
          <div className={styles.netLabel}>פנוי החודש</div>
          <div className={`${styles.netVal} ${styles.gold}`} dir="ltr">{fmt(remaining)}</div>
          <div className={styles.netSubOk}>חיסכון: {savingsPct}% ✓</div>
        </div>
      </div>

      {/* 3 stat boxes */}
      <div className={styles.statRow}>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>הכנסות</div>
          <div className={`${styles.statVal} ${styles.gold}`} dir="ltr">{fmt(income || plannedIncome)}</div>
          <div className={styles.statSub}>✓ משכורות</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>הוצאות</div>
          <div className={`${styles.statVal} ${styles.amber}`} dir="ltr">{fmt(expenses)}</div>
          <div className={styles.statSub}>{utilizationPct}% מהתקציב</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>נותר</div>
          <div className={`${styles.statVal} ${styles.green}`} dir="ltr">{fmt(remaining)}</div>
          <div className={styles.statSub}>{daysLeft} ימים</div>
        </div>
      </div>

      {/* Budget utilization */}
      <div className={styles.utilCard}>
        <div className={styles.utilHeader}>
          <span>ניצול תקציב משתנות</span>
          <span dir="ltr">{utilizationPct}% · {daysLeft} ימים נותרו</span>
        </div>
        <div className={styles.utilBar}>
          <div className={styles.utilFill} style={{ width: `${utilizationPct}%` }} />
        </div>
      </div>

      {/* Category groups */}
      {over.length > 0 && (
        <section className={`${styles.section} ${styles.sectionOver}`}>
          <h3 className={styles.sectionTitle}>חריגות</h3>
          {over.map(c => <CategoryRow key={c.id} c={c} />)}
        </section>
      )}

      {warn.length > 0 && (
        <section className={`${styles.section} ${styles.sectionWarn}`}>
          <h3 className={styles.sectionTitle}>אזהרה</h3>
          {warn.map(c => <CategoryRow key={c.id} c={c} />)}
        </section>
      )}

      {ok.length > 0 && (
        <section className={styles.section}>
          <button type="button" className={styles.collapseBtn} onClick={() => setOkCollapsed(v => !v)}>
            <span>בסדר</span>
            <span className={styles.collapseCount}>{ok.length} קטגוריות בתקציב</span>
            <span>{okCollapsed ? '▾' : '▴'}</span>
          </button>
          {!okCollapsed && ok.map(c => <CategoryRow key={c.id} c={c} />)}
        </section>
      )}
    </div>
  )
}
