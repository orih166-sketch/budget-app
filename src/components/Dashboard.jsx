import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { CATEGORIES, MONTHS, USERS } from '../data.js'
import styles from './Dashboard.module.css'

const fmt = n => '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })
const cat = id => [...CATEGORIES.expenses, ...CATEGORIES.income].find(c => c.id === id)

export default function Dashboard({ transactions, budget, user, selectedMonth, selectedYear, selectedUser = 'family', expectedIncome = 1690, onSetExpectedIncome }) {
  const monthTx = useMemo(() =>
    transactions.filter(t => {
      const d = new Date(t.date)
      const inMonth = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
      const inUser  = selectedUser === 'family' || t.user === selectedUser
      return inMonth && inUser
    }), [transactions, selectedMonth, selectedYear, selectedUser])

  const income   = useMemo(() => monthTx.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0), [monthTx])
  const expenses = useMemo(() => monthTx.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0), [monthTx])
  const balance  = income - expenses
  const savings  = income > 0 ? Math.round((balance / income) * 100) : 0

  const totalBudget = useMemo(() => Object.values(budget).reduce((a,v)=>a+v,0), [budget])
  const budgetPct   = totalBudget > 0 ? Math.min(100, Math.round((expenses / totalBudget) * 100)) : 0

  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const totalMonths = selectedYear * 12 + selectedMonth - 5 + i
      const month = ((totalMonths % 12) + 12) % 12
      const year  = Math.floor(totalMonths / 12)
      const txs = transactions.filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === month && d.getFullYear() === year
      })
      return {
        name: MONTHS[month].slice(0, 3),
        הכנסות: txs.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0),
        הוצאות: txs.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0),
      }
    })
  }, [transactions, selectedMonth, selectedYear])

  const catData = useMemo(() => {
    const map = {}
    monthTx.filter(t=>t.type==='expense').forEach(t => { map[t.category] = (map[t.category]||0) + t.amount })
    return Object.entries(map)
      .map(([id, amount]) => ({ id, amount, meta: cat(id) }))
      .filter(x => x.meta)
      .sort((a,b) => b.amount - a.amount)
      .slice(0, 6)
  }, [monthTx, budget])

  const recent = useMemo(() =>
    [...transactions]
      .filter(t => { const d = new Date(t.date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear })
      .sort((a,b) => b.date.localeCompare(a.date))
      .slice(0, 5)
  , [transactions, selectedMonth, selectedYear])

  // split per user
  const userSplit = useMemo(() => {
    return USERS.filter(u => u.id !== 'family').map(u => {
      const txs = transactions.filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && t.user === u.id && t.type === 'expense'
      })
      return { ...u, total: txs.reduce((a,t) => a+t.amount, 0), count: txs.length }
    })
  }, [transactions, selectedMonth, selectedYear])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'בוקר טוב'
    if (h < 17) return 'צהריים טובים'
    return 'ערב טוב'
  })()

  // ── Cash flow card ───────────────────────────────────────────────────────────
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput,   setIncomeInput]   = useState(String(expectedIncome))

  const isCurrentMonth = selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear()
  const daysInMonth    = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const dayOfMonth     = isCurrentMonth ? new Date().getDate() : daysInMonth
  const daysLeft       = Math.max(1, daysInMonth - dayOfMonth + 1)
  const remaining      = expectedIncome - expenses
  const dailyBudget    = Math.round(remaining / daysLeft)
  const spentPct       = expectedIncome > 0 ? Math.min(100, Math.round((expenses / expectedIncome) * 100)) : 0
  const isOverBudget   = remaining < 0

  function saveIncome() {
    const v = parseFloat(incomeInput)
    if (!isNaN(v) && v >= 0) onSetExpectedIncome?.(v)
    setEditingIncome(false)
  }

  return (
    <div className={styles.wrap}>

      {/* ── Cash flow card ── */}
      <div className={`${styles.cashCard} ${isOverBudget ? styles.cashCardOver : ''}`}>
        <div className={styles.cashTop}>
          <div>
            <div className={styles.cashLabel}>
              {isOverBudget ? '⚠️ חרגת מהתקציב' : isCurrentMonth ? 'נשאר לך החודש' : `נשאר — ${MONTHS[selectedMonth]}`}
            </div>
            <div className={`${styles.cashAmount} ${isOverBudget ? styles.cashAmountOver : ''}`}>
              {isOverBudget ? '-' : ''}{fmt(Math.abs(remaining))}
            </div>
            {isCurrentMonth && !isOverBudget && (
              <div className={styles.cashDaily}>≈ {fmt(dailyBudget)} ליום · {daysLeft} ימים נותרו</div>
            )}
          </div>
          <div className={styles.cashRight}>
            <div className={styles.cashIncomeRow}>
              {editingIncome ? (
                <div className={styles.cashEditWrap}>
                  <input
                    className={styles.cashEditInput}
                    type="number"
                    value={incomeInput}
                    onChange={e => setIncomeInput(e.target.value)}
                    onBlur={saveIncome}
                    onKeyDown={e => e.key === 'Enter' && saveIncome()}
                    autoFocus
                  />
                  <button className={styles.cashEditSave} onClick={saveIncome}>✓</button>
                </div>
              ) : (
                <>
                  <span className={styles.cashIncomeLabel}>הכנסה צפויה</span>
                  <span className={styles.cashIncomeVal}>{fmt(expectedIncome)}</span>
                  <button className={styles.cashEditBtn} onClick={() => { setIncomeInput(String(expectedIncome)); setEditingIncome(true) }}>✏️</button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className={styles.cashBarWrap}>
          <div
            className={`${styles.cashBar} ${isOverBudget ? styles.cashBarOver : spentPct > 80 ? styles.cashBarWarn : styles.cashBarOk}`}
            style={{ width: `${spentPct}%` }}
          />
        </div>
        <div className={styles.cashBarLabels}>
          <span>הוצאות {fmt(expenses)}</span>
          <span>{spentPct}%</span>
        </div>
      </div>

      {/* Hero card */}
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.heroGreet}>{greeting}{user?.name ? `, ${user.name}` : ''}</div>
            <div className={styles.heroMonth}>{MONTHS[selectedMonth]} {selectedYear}</div>
          </div>
          <div style={{ textAlign:'left' }}>
            <div className={styles.heroGreet}>חיסכון</div>
            <div className={styles.heroMonth} style={{ color: savings >= 0 ? '#4ade80' : '#f87171' }}>{savings}%</div>
          </div>
        </div>

        <div className={styles.heroCenter}>
          <div className={styles.heroLabel}>סה"כ הוצאות החודש</div>
          <div className={styles.heroAmount}>{fmt(expenses)}</div>
          {totalBudget > 0 && (
            <div className={styles.heroBudget}>מתוך תקציב {fmt(totalBudget)}</div>
          )}
        </div>

        {totalBudget > 0 && (
          <div className={styles.heroBar}>
            <div className={styles.heroBarFill} style={{ width: `${budgetPct}%` }} />
          </div>
        )}

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLabel}>הכנסות</div>
            <div className={`${styles.heroStatVal} ${styles.heroInc}`}>{fmt(income)}</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLabel}>יתרה</div>
            <div className={`${styles.heroStatVal} ${balance >= 0 ? styles.heroInc : styles.heroExp}`}>{fmt(balance)}</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLabel}>הוצאות</div>
            <div className={`${styles.heroStatVal} ${styles.heroExp}`}>{fmt(expenses)}</div>
          </div>
        </div>
      </div>

      {/* User split */}
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
                <div className={styles.splitBar}>
                  <div className={styles.splitFill} style={{ width: `${pct}%`, background: u.color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Trend chart */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>מגמה — 6 חודשים אחרונים</h3>
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={trendData} margin={{ top:5, right:5, bottom:0, left:-20 }}>
            <defs>
              <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fontSize:12, fill:'#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:11, fill:'#6b7280' }} tickFormatter={v=>v>=1000?`${v/1000}K`:v} axisLine={false} tickLine={false} />
            <Tooltip formatter={v=>fmt(v)} contentStyle={{ borderRadius:10, border:'1px solid #e0d9d0', fontSize:13 }} />
            <Area type="monotone" dataKey="הכנסות" stroke="#10b981" fill="url(#gi)" strokeWidth={2.5} dot={false} />
            <Area type="monotone" dataKey="הוצאות" stroke="#ef4444" fill="url(#ge)" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Categories */}
      {catData.length > 0 && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>הוצאות לפי קטגוריה</h3>
          {catData.map(({ id, amount, meta }) => {
            const pct = budget[id] ? Math.min(100, Math.round((amount / budget[id]) * 100)) : null
            const barColor = pct > 90 ? 'var(--c-red)' : pct > 70 ? 'var(--c-yellow)' : meta.color
            return (
              <div key={id} className={styles.catRow}>
                <div className={styles.catIconWrap} style={{ background: meta.color + '1a' }}>
                  <span style={{ fontSize:16 }}>{meta.icon}</span>
                </div>
                <div className={styles.catInfo}>
                  <div className={styles.catTop}>
                    <span className={styles.catLabel}>{meta.label}</span>
                    <span className={styles.catAmt}>{fmt(amount)}{budget[id] ? ` / ${fmt(budget[id])}` : ''}</span>
                  </div>
                  {pct !== null && (
                    <div className={styles.bar}>
                      <div className={styles.barFill} style={{ width:`${pct}%`, background: barColor }} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent transactions */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>עסקאות אחרונות</h3>
        {recent.map(t => {
          const c = cat(t.category)
          return (
            <div key={t.id} className={styles.txRow}>
              <div className={styles.txIconWrap}>
                <span>{c?.icon || '📦'}</span>
              </div>
              <div className={styles.txInfo}>
                <span className={styles.txDesc}>{t.desc}</span>
                <span className={styles.txDate}>{t.date}</span>
              </div>
              <span className={`${styles.txAmt} ${t.type==='income'?styles.inc:styles.exp}`}>
                {t.type==='income'?'+':'-'}{fmt(t.amount)}
              </span>
            </div>
          )
        })}
      </div>

    </div>
  )
}
