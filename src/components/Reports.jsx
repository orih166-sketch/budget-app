import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import * as XLSX from 'xlsx'
import { CATEGORIES, MONTHS } from '../data.js'
import styles from './Reports.module.css'

const fmt = n => '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })
const allCats = [...CATEGORIES.expenses, ...CATEGORIES.income]
const cat = id => allCats.find(c => c.id === id)

function exportToExcel(transactions, year) {
  const rows = transactions
    .filter(t => new Date(t.date).getFullYear() === year)
    .map(t => ({
      תאריך: new Date(t.date).toLocaleDateString('he-IL'),
      עסק: t.merchant || t.description || '',
      קטגוריה: t.category || '',
      סכום: t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
      סוג: t.type === 'income' ? 'הכנסה' : 'הוצאה',
      'אמצעי תשלום': t.paymentMethod || '',
      'שולם ע"י': t.paidBy || t.user || '',
    }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `עסקאות ${year}`)
  XLSX.writeFile(wb, `כלכלת-בית-${year}.xlsx`)
}

export default function Reports({ transactions }) {
  const now  = new Date()
  const year = now.getFullYear()

  const monthly = useMemo(() =>
    Array.from({ length: 12 }, (_, m) => {
      const txs = transactions.filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === m && d.getFullYear() === year
      })
      return {
        name: MONTHS[m].slice(0, 3),
        הכנסות: txs.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0),
        הוצאות: txs.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
      }
    }), [transactions, year])

  const yearTxns = useMemo(() =>
    transactions.filter(t => new Date(t.date).getFullYear() === year),
    [transactions, year])

  const byCat = useMemo(() => {
    const map = {}
    yearTxns.forEach(t => {
      if (t.type === 'expense') map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map)
      .map(([id, amount]) => ({ id, amount, meta: cat(id) }))
      .filter(x => x.meta)
      .sort((a, b) => b.amount - a.amount)
  }, [yearTxns])

  const totalIncome   = yearTxns.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const totalExpenses = yearTxns.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0)

  return (
    <div className={styles.wrap}>
      <div className={styles.exportRow}>
        <button
          className={styles.exportBtn}
          onClick={() => exportToExcel(transactions, year)}
          disabled={yearTxns.length === 0}
        >
          ⬇ ייצוא לאקסל {year}
        </button>
      </div>

      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kLabel}>סך הכנסות {year}</span>
          <span className={styles.kValue} style={{ color:'var(--c-green)' }}>{fmt(totalIncome)}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kLabel}>סך הוצאות {year}</span>
          <span className={styles.kValue} style={{ color:'var(--c-red)' }}>{fmt(totalExpenses)}</span>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>הכנסות vs הוצאות לפי חודש</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthly} margin={{ top:5, right:5, bottom:0, left:-20 }}>
            <XAxis dataKey="name" tick={{ fontSize:11 }} />
            <YAxis tick={{ fontSize:11 }} tickFormatter={v => v >= 1000 ? `${v/1000}K` : v} />
            <Tooltip formatter={v => fmt(v)} />
            <Bar dataKey="הכנסות" fill="#10b981" radius={[4,4,0,0]} />
            <Bar dataKey="הוצאות" fill="#ef4444" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>הוצאות לפי קטגוריה — כל השנה</h3>
        {byCat.map(({ id, amount, meta }) => {
          const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
          return (
            <div key={id} className={styles.catRow}>
              <span>{meta.icon}</span>
              <div className={styles.catInfo}>
                <div className={styles.catTop}>
                  <span className={styles.catLabel}>{meta.label}</span>
                  <span className={styles.catAmt}>{fmt(amount)} ({pct}%)</span>
                </div>
                <div className={styles.barWrap}>
                  <div className={styles.bar} style={{ width:`${pct}%`, background: meta.color }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
