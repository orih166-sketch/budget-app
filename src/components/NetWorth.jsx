import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAccounts } from '../hooks/useAccounts.js'
import { HOUSEHOLD } from '../data/household.js'
import { formatMoney } from '../utils/formatMoney.js'
import styles from './NetWorth.module.css'

const fmt = n => formatMoney(n)

const DEFAULT_ASSETS = [
  { id: 'ayalon', name: 'איילון (קרן פנסיה)', emoji: '💰', key: 'pension' },
  { id: 'migdal', name: 'מגדל (קרן השתלמות)', emoji: '💰', key: 'investment' },
  { id: 'mor', name: 'מור (גמל להשקעה)', emoji: '💰', key: 'investment' },
  { id: 'analyst', name: 'אנליסט (גמל)', emoji: '💰', key: 'investment' },
  { id: 'bank', name: 'חשבון עו"ש', emoji: '🏦', key: 'checking' },
]

export default function NetWorth() {
  const { accounts, netWorth, totalAssets, totalLiab } = useAccounts()
  const [target, setTarget] = useState(2000000)

  const assetRows = useMemo(() => {
    if (accounts?.length) {
      return accounts.filter(a => a.type === 'asset').map(a => ({
        id: a.id,
        name: a.name,
        emoji: '📈',
        value: a.balance,
      }))
    }
    return DEFAULT_ASSETS.map(a => ({
      ...a,
      value: a.key === 'checking' ? 50000 : 300000,
    }))
  }, [accounts])

  const liabilities = useMemo(() => {
    if (accounts?.length) {
      return accounts.filter(a => a.type === 'liability')
    }
    return [{
      id: 'car',
      name: 'הלוואת רכב',
      emoji: '🚗',
      balance: HOUSEHOLD.carLoan.remaining,
      monthly: HOUSEHOLD.carLoan.monthlyPayment,
      endDate: HOUSEHOLD.carLoan.endDate,
    }]
  }, [accounts])

  const nw = netWorth || totalAssets - totalLiab || assetRows.reduce((a, r) => a + r.value, 0) - HOUSEHOLD.carLoan.remaining
  const assetsTotal = totalAssets || assetRows.reduce((a, r) => a + r.value, 0)
  const liabTotal = totalLiab || HOUSEHOLD.carLoan.remaining

  const monthsToTarget = useMemo(() => {
    const gap = target - nw
    if (gap <= 0) return 0
    return Math.ceil(gap / HOUSEHOLD.savingsMonthly)
  }, [target, nw])

  const trendData = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const month = (new Date().getMonth() - 11 + i + 12) % 12
      const growth = nw - (11 - i) * HOUSEHOLD.savingsMonthly
      return { name: ['ינ','פב','מר','אפ','מא','יו','יול','או','ספ','או','נו','דצ'][month], value: Math.max(0, growth) }
    })
  , [nw])

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <div className={styles.heroLabel}>שווי נקי</div>
        <div className={styles.heroVal} dir="ltr">{fmt(nw)}</div>
        <div className={styles.heroSub}>
          <span>נכסים: <span dir="ltr">{fmt(assetsTotal)}</span></span>
          <span className={styles.divider}>|</span>
          <span>התחייבויות: <span dir="ltr">{fmt(liabTotal)}</span></span>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>נכסים</h3>
        {assetRows.map(a => (
          <div key={a.id} className={styles.row}>
            <span>{a.emoji} {a.name}</span>
            <span dir="ltr">{fmt(a.value)}</span>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>התחייבויות</h3>
        {liabilities.map(l => (
          <div key={l.id} className={styles.liabCard}>
            <div className={styles.row}>
              <span>{l.emoji || '🚗'} {l.name}</span>
              <span dir="ltr">{fmt(l.balance)} נותר</span>
            </div>
            {l.monthly && (
              <div className={styles.liabSub} dir="ltr">
                ₪{l.monthly.toLocaleString('he-IL')}/חודש · מסתיים {l.endDate?.replace('-', '/')}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>סימולטור יעד</h3>
        <label className={styles.simLabel}>אני רוצה להגיע ל-</label>
        <input
          className={styles.simInput}
          type="number"
          value={target}
          onChange={e => setTarget(Number(e.target.value))}
          dir="ltr"
        />
        <p className={styles.simResult}>
          {monthsToTarget === 0
            ? '🎉 הגעתם ליעד!'
            : `בעוד ${monthsToTarget} חודשים עם קצב חיסכון נוכחי`}
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>מגמה — 12 חודשים</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trendData}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} axisLine={false} tickLine={false} />
            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--gold-border)', borderRadius: 8 }} />
            <Line type="monotone" dataKey="value" stroke="var(--gold)" strokeWidth={2} dot={{ fill: 'var(--gold)', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
