import { useMemo, useState, useEffect, useRef } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { CATEGORIES, MONTHS, USERS } from '../data.js'
import { useCategoryBudgets } from '../hooks/useCategoryBudgets.js'
import AlertBanner from './AlertBanner.jsx'
import styles from './Dashboard.module.css'

const fmt  = n => '₪' + Number(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })
const fmtK = v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v
const cat  = id => [...CATEGORIES.expenses, ...CATEGORIES.income].find(c => c.id === id)

const GOLD    = '#c9a84c'
const GREEN   = '#22c55e'
const RED     = '#ef4444'
const MUTED   = 'rgba(255,255,255,.35)'

const CAT_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16']

export default function Dashboard({
  transactions, budget, user,
  selectedMonth, selectedYear,
  selectedUser = 'family',
  expectedIncome = 0,
  onSetExpectedIncome
}) {
  const { budgets: categoryBudgets } = useCategoryBudgets()
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput,   setIncomeInput]   = useState(String(expectedIncome))
  const [chartType,     setChartType]     = useState('area') // area | bar

  // ── Alerts ──────────────────────────────────────────
  const alerts = useMemo(() => {
    const monthTx = transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && t.type === 'expense'
    })
    const actual = {}
    monthTx.forEach(t => { actual[t.category] = (actual[t.category] || 0) + t.amount })
    return Object.entries(actual).flatMap(([catId, spent]) => {
      const budgeted = categoryBudgets[catId] || budget[catId] || 0
      if (!budgeted || spent <= budgeted) return []
      const overage = spent - budgeted
      const c = [...CATEGORIES.expenses, ...CATEGORIES.income].find(x => x.id === catId)
      return [{ id: catId, severity: spent > budgeted * 1.2 ? 'critical' : 'warning', message: `${c?.label || catId}: חרגת ב-${fmt(overage)}` }]
    })
  }, [transactions, selectedMonth, selectedYear, categoryBudgets, budget])

  // ── Month filter ─────────────────────────────────────
  const monthTx = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
             && (selectedUser === 'family' || t.user === selectedUser)
    }), [transactions, selectedMonth, selectedYear, selectedUser])

  const income   = useMemo(() => monthTx.filter(t => t.type === 'income').reduce((a,t) => a+t.amount, 0), [monthTx])
  const expenses = useMemo(() => monthTx.filter(t => t.type === 'expense').reduce((a,t) => a+t.amount, 0), [monthTx])
  const balance  = income - expenses
  const savingsPct = income > 0 ? Math.round((balance / income) * 100) : 0

  // ── Cash flow ────────────────────────────────────────
  const isCurrentMonth = selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear()
  const daysInMonth    = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const dayOfMonth     = isCurrentMonth ? new Date().getDate() : daysInMonth
  const daysLeft       = Math.max(1, daysInMonth - dayOfMonth + 1)
  const hasIncomeBudget = expectedIncome > 0
  const remaining      = expectedIncome - expenses
  const dailyBudget    = Math.round(remaining / Math.max(1, daysLeft))
  const spentPct       = hasIncomeBudget ? Math.min(100, Math.round((expenses / expectedIncome) * 100)) : 0
  const isOverBudget   = hasIncomeBudget && remaining < 0

  function saveIncome() {
    const v = parseFloat(incomeInput)
    if (!isNaN(v) && v >= 0) onSetExpectedIncome?.(v)
    setEditingIncome(false)
  }

  // ── 12-month trend ───────────────────────────────────
  const trendData = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const totalMonths = selectedYear * 12 + selectedMonth - 11 + i
      const month = ((totalMonths % 12) + 12) % 12
      const year  = Math.floor(totalMonths / 12)
      const txs   = transactions.filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === month && d.getFullYear() === year
      })
      return {
        name: MONTHS[month].slice(0, 3),
        הכנסות: txs.filter(t => t.type === 'income').reduce((a,t) => a+t.amount, 0),
        הוצאות: txs.filter(t => t.type === 'expense').reduce((a,t) => a+t.amount, 0),
      }
    })
  , [transactions, selectedMonth, selectedYear])

  // ── Category pie ─────────────────────────────────────
  const catData = useMemo(() => {
    const map = {}
    monthTx.filter(t => t.type === 'expense').forEach(t => { map[t.category] = (map[t.category]||0) + t.amount })
    return Object.entries(map)
      .map(([id, amount]) => ({ id, amount, meta: cat(id) }))
      .filter(x => x.meta)
      .sort((a,b) => b.amount - a.amount)
      .slice(0, 6)
  }, [monthTx])

  // ── Top 3 expenses ───────────────────────────────────
  const top3 = catData.slice(0, 3)

  // ── Recent ───────────────────────────────────────────
  const recent = useMemo(() =>
    [...transactions]
      .filter(t => { const d = new Date(t.date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear })
      .sort((a,b) => b.date.localeCompare(a.date))
      .slice(0, 5)
  , [transactions, selectedMonth, selectedYear])

  // ── User split ───────────────────────────────────────
  const userSplit = useMemo(() =>
    USERS.filter(u => u.id !== 'family').map(u => {
      const txs = transactions.filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && t.user === u.id && t.type === 'expense'
      })
      return { ...u, total: txs.reduce((a,t) => a+t.amount, 0), count: txs.length }
    })
  , [transactions, selectedMonth, selectedYear])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'בוקר טוב'
    if (h < 17) return 'צהריים טובים'
    return 'ערב טוב'
  })()

  // ── Financial health score ────────────────────────────
  const healthScore = useMemo(() => {
    let score = 60
    if (savingsPct >= 20) score += 20
    else if (savingsPct >= 10) score += 10
    if (spentPct <= 80) score += 10
    if (balance >= 0) score += 10
    return Math.min(100, score)
  }, [savingsPct, spentPct, balance])

  const healthColor = healthScore >= 80 ? GREEN : healthScore >= 60 ? GOLD : RED
  const healthLabel = healthScore >= 80 ? 'מצוין' : healthScore >= 60 ? 'סביר' : 'לשיפור'

  return (
    <div className={styles.wrap}>
      <AlertBanner alerts={alerts} />

      {/* ── HERO ── */}
      <div className={`${styles.hero} ${isOverBudget ? styles.heroOver : ''}`}>
        <div className={styles.heroHeader}>
          <div>
            <div className={styles.heroGreet}>{greeting}{user?.name ? `, ${user.name}` : ''}</div>
            <div className={styles.heroMonth}>{MONTHS[selectedMonth]} {selectedYear}</div>
          </div>
          <div className={styles.heroIncomeBox}>
            <div className={styles.heroIncomeLabel}>הכנסה צפויה</div>
            {editingIncome ? (
              <div className={styles.heroEditRow}>
                <input className={styles.heroEditInput} type="number"
                  value={incomeInput}
                  onChange={e => setIncomeInput(e.target.value)}
                  onBlur={saveIncome}
                  onKeyDown={e => e.key === 'Enter' && saveIncome()}
                  autoFocus />
                <button className={styles.heroEditSave} onClick={saveIncome}>✓</button>
              </div>
            ) : (
              <div className={styles.heroIncomeValRow}>
                <span className={styles.heroIncomeVal}>{fmt(expectedIncome)}</span>
                <button className={styles.heroEditBtn} onClick={() => { setIncomeInput(String(expectedIncome)); setEditingIncome(true) }}>✏️</button>
              </div>
            )}
          </div>
        </div>

        {/* Big remaining */}
        <div className={styles.heroCenter}>
          <div className={styles.heroCenterLabel}>
            {isOverBudget ? '⚠️ חרגת מהתקציב' : hasIncomeBudget ? 'נשאר החודש' : 'יתרה החודש'}
          </div>
          <div className={`${styles.heroBigNum} ${isOverBudget ? styles.heroBigOver : ''}`}>
            {isOverBudget ? '-' : (hasIncomeBudget ? '' : (balance >= 0 ? '+' : '-'))}{fmt(Math.abs(hasIncomeBudget ? remaining : balance))}
          </div>
          {isCurrentMonth && !isOverBudget && hasIncomeBudget && (
            <div className={styles.heroDailyHint}>≈ {fmt(dailyBudget)} ליום · {daysLeft} ימים נותרו</div>
          )}
        </div>

        {/* Progress bar */}
        <div className={styles.heroBarWrap}>
          <div className={`${styles.heroBar} ${isOverBudget ? styles.heroBarRed : spentPct > 80 ? styles.heroBarYellow : styles.heroBarGreen}`}
            style={{ width: `${spentPct}%` }} />
        </div>
        <div className={styles.heroBarRow}>
          <span>הוצאות {fmt(expenses)}</span>
          <span>{spentPct}%</span>
        </div>

        {/* Stats row */}
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLbl}>הכנסות</div>
            <div className={`${styles.heroStatVal} ${styles.green}`}>{fmt(income)}</div>
          </div>
          <div className={styles.heroStatDivider}/>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLbl}>יתרה</div>
            <div className={`${styles.heroStatVal} ${balance >= 0 ? styles.green : styles.red}`}>{fmt(balance)}</div>
          </div>
          <div className={styles.heroStatDivider}/>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLbl}>חיסכון</div>
            <div className={`${styles.heroStatVal} ${savingsPct >= 0 ? styles.gold : styles.red}`}>{savingsPct}%</div>
          </div>
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(34,197,94,.12)', color: GREEN }}>↑</div>
          <div className={styles.kpiBody}>
            <div className={styles.kpiLbl}>הכנסות</div>
            <div className={styles.kpiVal} style={{ color: GREEN }}>{fmt(income)}</div>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(239,68,68,.1)', color: RED }}>↓</div>
          <div className={styles.kpiBody}>
            <div className={styles.kpiLbl}>הוצאות</div>
            <div className={styles.kpiVal} style={{ color: RED }}>{fmt(expenses)}</div>
          </div>
        </div>
        <div className={styles.kpiCard} style={{ gridColumn: 'span 2' }}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(201,168,76,.12)', color: GOLD }}>◎</div>
          <div className={styles.kpiBody}>
            <div className={styles.kpiLbl}>בריאות פיננסית</div>
            <div className={styles.kpiVal} style={{ color: healthColor }}>{healthScore}/100 — {healthLabel}</div>
          </div>
        </div>
      </div>

      {/* ── BALANCE CARD ── */}
      <div className={styles.card}>
        <h3 className={`${styles.cardTitle} ${styles.cardTitleStandalone}`}>מאזן הכנסות והוצאות</h3>

        <div className={styles.balanceRow}>
          <span className={styles.balanceLabel}>
            <span className={styles.balanceDot} style={{ background: GREEN }} />
            הכנסות
          </span>
          <div className={styles.balanceBarWrap}>
            <div className={styles.balanceBar} style={{
              width: `${income >= expenses ? 100 : income > 0 ? Math.round((income / Math.max(expenses, 1)) * 100) : 0}%`,
              background: 'linear-gradient(90deg, #16a34a, #4ade80)'
            }} />
          </div>
          <span className={styles.balanceAmt} style={{ color: GREEN }}>{fmt(income)}</span>
        </div>

        <div className={styles.balanceRow}>
          <span className={styles.balanceLabel}>
            <span className={styles.balanceDot} style={{ background: RED }} />
            הוצאות
          </span>
          <div className={styles.balanceBarWrap}>
            <div className={styles.balanceBar} style={{
              width: `${expenses >= income ? 100 : expenses > 0 ? Math.round((expenses / Math.max(income, 1)) * 100) : 0}%`,
              background: 'linear-gradient(90deg, #dc2626, #f87171)'
            }} />
          </div>
          <span className={styles.balanceAmt} style={{ color: RED }}>{fmt(expenses)}</span>
        </div>

        <div className={styles.balanceDivider} />

        <div className={styles.balanceResult}>
          <div>
            <div className={styles.balanceResultLabel}>יתרה נטו</div>
            {income > 0 && (
              <div className={styles.balanceResultSub}>שיעור חיסכון {savingsPct}%</div>
            )}
          </div>
          <span className={styles.balanceResultAmt} style={{ color: balance >= 0 ? GREEN : RED }}>
            {balance >= 0 ? '+' : ''}{fmt(balance)}
          </span>
        </div>
      </div>

      {/* ── USER SPLIT ── */}
      {userSplit.some(u => u.total > 0) && (
        <div className={styles.splitRow}>
          {userSplit.map(u => {
            const pct = expenses > 0 ? Math.round((u.total / expenses) * 100) : 0
            return (
              <div key={u.id} className={styles.splitCard}>
                <div className={styles.splitAvatar} style={{ background: u.color }}>{u.avatar}</div>
                <div className={styles.splitName}>{u.name}</div>
                <div className={styles.splitAmt} style={{ color: u.color }}>{fmt(u.total)}</div>
                <div className={styles.splitSub}>{u.count} עסקאות · {pct}%</div>
                <div className={styles.splitBar}><div className={styles.splitFill} style={{ width:`${pct}%`, background: u.color }} /></div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── TREND CHART ── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h3 className={styles.cardTitle}>מגמה — 12 חודשים</h3>
          <div className={styles.chartToggle}>
            <button className={`${styles.chartToggleBtn} ${chartType==='area'?styles.chartToggleActive:''}`} onClick={() => setChartType('area')}>קווים</button>
            <button className={`${styles.chartToggleBtn} ${chartType==='bar'?styles.chartToggleActive:''}`} onClick={() => setChartType('bar')}>עמודות</button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          {chartType === 'area' ? (
            <AreaChart data={trendData} margin={{ top:8, right:4, bottom:0, left:-18 }}>
              <defs>
                <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={GREEN} stopOpacity={.3}/>
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={RED} stopOpacity={.2}/>
                  <stop offset="95%" stopColor={RED} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.05)" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:'#9ca3af' }} tickFormatter={fmtK} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius:12, border:'1px solid #e5e7eb', fontSize:13, boxShadow:'0 4px 16px rgba(0,0,0,.1)' }}/>
              <Area type="monotone" dataKey="הכנסות" stroke={GREEN} fill="url(#gi)" strokeWidth={2.5} dot={{ r:3, fill:GREEN }} activeDot={{ r:5 }}/>
              <Area type="monotone" dataKey="הוצאות" stroke={RED}   fill="url(#ge)" strokeWidth={2.5} dot={{ r:3, fill:RED }}   activeDot={{ r:5 }}/>
            </AreaChart>
          ) : (
            <BarChart data={trendData} margin={{ top:8, right:4, bottom:0, left:-18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.05)" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:'#9ca3af' }} tickFormatter={fmtK} axisLine={false} tickLine={false}/>
              <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius:12, border:'1px solid #e5e7eb', fontSize:13, boxShadow:'0 4px 16px rgba(0,0,0,.1)' }}/>
              <Bar dataKey="הכנסות" fill={GREEN} radius={[4,4,0,0]} maxBarSize={18}/>
              <Bar dataKey="הוצאות" fill={RED}   radius={[4,4,0,0]} maxBarSize={18}/>
            </BarChart>
          )}
        </ResponsiveContainer>

        <div className={styles.legendRow}>
          <span className={styles.legendDot} style={{ background: GREEN }}/><span className={styles.legendLbl}>הכנסות</span>
          <span className={styles.legendDot} style={{ background: RED   }}/><span className={styles.legendLbl}>הוצאות</span>
        </div>
      </div>

      {/* ── CATEGORY DONUT + LIST ── */}
      {catData.length > 0 && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>הוצאות לפי קטגוריה</h3>
          <div className={styles.catLayout}>
            {/* Donut */}
            <div className={styles.donutWrap}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={42} outerRadius={64}
                    dataKey="amount" paddingAngle={3} startAngle={90} endAngle={-270}>
                    {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius:10, fontSize:12 }}/>
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.donutCenter}>
                <div className={styles.donutTotal}>{fmt(expenses)}</div>
                <div className={styles.donutLbl}>סה"כ</div>
              </div>
            </div>

            {/* List */}
            <div className={styles.catList}>
              {catData.map(({ id, amount, meta }, i) => {
                const pct = expenses > 0 ? Math.round((amount / expenses) * 100) : 0
                const color = CAT_COLORS[i % CAT_COLORS.length]
                return (
                  <div key={id} className={styles.catRow}>
                    <span className={styles.catDot} style={{ background: color }}/>
                    <div className={styles.catInfo}>
                      <div className={styles.catTop}>
                        <span className={styles.catLabel}>{meta.icon} {meta.label}</span>
                        <span className={styles.catAmt}>{fmt(amount)}</span>
                      </div>
                      <div className={styles.catBar}>
                        <div className={styles.catBarFill} style={{ width:`${pct}%`, background: color }}/>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── RECENT TRANSACTIONS ── */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>עסקאות אחרונות</h3>
        {recent.length === 0 && <div className={styles.empty}>אין עסקאות החודש</div>}
        {recent.map(t => {
          const c = cat(t.category)
          return (
            <div key={t.id} className={styles.txRow}>
              <div className={styles.txIcon}>{c?.icon || '📦'}</div>
              <div className={styles.txInfo}>
                <span className={styles.txDesc}>{t.desc}</span>
                <span className={styles.txDate}>{t.date}</span>
              </div>
              <span className={`${styles.txAmt} ${t.type==='income' ? styles.green : styles.red}`}>
                {t.type==='income' ? '+' : '-'}{fmt(t.amount)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
