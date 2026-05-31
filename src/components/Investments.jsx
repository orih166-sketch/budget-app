import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { MONTHS } from '../data.js'
import styles from './Investments.module.css'

const fmt = n => '₪' + Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })

const LS_GOAL = 'budget_invest_goal'
const loadGoal = () => { try { return parseFloat(localStorage.getItem(LS_GOAL)) || 0 } catch { return 0 } }

export default function Investments({ transactions }) {
  const [goal, setGoal]         = useState(loadGoal)
  const [editGoal, setEditGoal] = useState(false)
  const [draftGoal, setDraft]   = useState('')

  const now = new Date()
  const curMonth = now.getMonth()
  const curYear  = now.getFullYear()

  // last 6 months data
  const monthData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const totalM = curYear * 12 + curMonth - 5 + i
      const month  = ((totalM % 12) + 12) % 12
      const year   = Math.floor(totalM / 12)
      const txs    = transactions.filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === month && d.getFullYear() === year
      })
      const income   = txs.filter(t => t.type === 'income').reduce((a,t) => a+t.amount, 0)
      const expenses = txs.filter(t => t.type === 'expense').reduce((a,t) => a+t.amount, 0)
      const surplus  = income - expenses
      return { name: MONTHS[month].slice(0,3), income, expenses, surplus, month, year }
    })
  }, [transactions, curMonth, curYear])

  const current   = monthData[5]
  const avgSurplus = monthData.reduce((a,m) => a+m.surplus, 0) / 6
  const goalPct    = goal > 0 ? Math.min(100, Math.round((current.surplus / goal) * 100)) : 0

  function saveGoal() {
    const v = parseFloat(draftGoal) || 0
    setGoal(v)
    localStorage.setItem(LS_GOAL, String(v))
    setEditGoal(false)
  }

  const surplusColor = current.surplus >= 0 ? 'var(--c-green)' : 'var(--c-red)'

  return (
    <div className={styles.wrap}>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div>
            <div className={styles.heroLabel}>פנוי להשקעה החודש</div>
            <div className={styles.heroValue} style={{ color: current.surplus >= 0 ? '#4ade80' : '#f87171' }}>
              {current.surplus >= 0 ? '' : '-'}{fmt(current.surplus)}
            </div>
            <div className={styles.heroSub}>{MONTHS[curMonth]} {curYear}</div>
          </div>
          <div style={{ textAlign:'left' }}>
            <div className={styles.heroLabel}>ממוצע 6 חודשים</div>
            <div className={styles.heroSmall} style={{ color: avgSurplus >= 0 ? '#4ade80' : '#f87171' }}>
              {avgSurplus >= 0 ? '' : '-'}{fmt(avgSurplus)}
            </div>
          </div>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLabel}>הכנסות</div>
            <div className={styles.heroStatVal} style={{ color: '#4ade80' }}>{fmt(current.income)}</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLabel}>הוצאות</div>
            <div className={styles.heroStatVal} style={{ color: '#f87171' }}>{fmt(current.expenses)}</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatLabel}>יתרה</div>
            <div className={styles.heroStatVal} style={{ color: current.surplus >= 0 ? '#4ade80' : '#f87171' }}>
              {current.surplus >= 0 ? '' : '-'}{fmt(current.surplus)}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly goal */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>יעד חיסכון חודשי</span>
          <button className={styles.editBtn} onClick={() => { setDraft(String(goal || '')); setEditGoal(e => !e) }}>
            {editGoal ? 'ביטול' : 'קבע יעד'}
          </button>
        </div>

        {editGoal ? (
          <div className={styles.goalEdit}>
            <input
              className={styles.goalInput}
              type="number" min="0"
              placeholder="למשל: 2000"
              value={draftGoal}
              onChange={e => setDraft(e.target.value)}
            />
            <button className={styles.goalSave} onClick={saveGoal}>שמור</button>
          </div>
        ) : goal > 0 ? (
          <div>
            <div className={styles.goalRow}>
              <span className={styles.goalLabel}>
                {current.surplus >= goal
                  ? '✅ עמדת ביעד!'
                  : current.surplus > 0
                  ? `נשאר עוד ${fmt(goal - current.surplus)} ליעד`
                  : 'החודש בגירעון'}
              </span>
              <span className={styles.goalAmt}>{fmt(current.surplus)} / {fmt(goal)}</span>
            </div>
            <div className={styles.goalBar}>
              <div className={styles.goalFill} style={{
                width: `${Math.max(0, goalPct)}%`,
                background: goalPct >= 100 ? 'var(--c-green)' : goalPct >= 60 ? 'var(--c-gold)' : 'var(--c-red)'
              }} />
            </div>
            <div className={styles.goalPct}>{Math.max(0, goalPct)}% מהיעד</div>
          </div>
        ) : (
          <p className={styles.noGoal}>הגדר יעד חיסכון חודשי כדי לעקוב אחרי ההתקדמות</p>
        )}
      </div>

      {/* 6-month trend */}
      <div className={styles.card}>
        <div className={styles.cardTitle} style={{ marginBottom: 14 }}>פנוי להשקעה — 6 חודשים אחרונים</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthData} margin={{ top:5, right:5, bottom:0, left:-20 }}>
            <XAxis dataKey="name" tick={{ fontSize:12, fill:'#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:11, fill:'#6b7280' }} tickFormatter={v => v>=1000?`${v/1000}K`:v} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v, name) => [fmt(v), name === 'surplus' ? 'פנוי להשקעה' : name]}
              contentStyle={{ borderRadius:10, border:'1px solid #e0d9d0', fontSize:13 }}
            />
            <ReferenceLine y={0} stroke="var(--c-border)" />
            {goal > 0 && <ReferenceLine y={goal} stroke="#c9a84c" strokeDasharray="4 3" label={{ value:'יעד', position:'insideTopRight', fill:'#c9a84c', fontSize:11 }} />}
            <Bar dataKey="surplus" name="surplus" radius={[5,5,0,0]}
              fill="#1a2744"
              label={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Income vs Expenses detail */}
      <div className={styles.card}>
        <div className={styles.cardTitle} style={{ marginBottom: 14 }}>הכנסות מול הוצאות</div>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={monthData} margin={{ top:5, right:5, bottom:0, left:-20 }}>
            <XAxis dataKey="name" tick={{ fontSize:12, fill:'#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:11, fill:'#6b7280' }} tickFormatter={v => v>=1000?`${v/1000}K`:v} axisLine={false} tickLine={false} />
            <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius:10, border:'1px solid #e0d9d0', fontSize:13 }} />
            <Bar dataKey="income"   name="הכנסות" fill="#10b981" radius={[4,4,0,0]} />
            <Bar dataKey="expenses" name="הוצאות" fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
