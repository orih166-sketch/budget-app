import { useMemo } from 'react'
import { MONTHS } from '../data.js'
import styles from './Insights.module.css'

const fmt = n => '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })

export default function Insights({ transactions, selectedMonth, selectedYear }) {
  const insights = useMemo(() => {
    const currentMonth = selectedMonth
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear

    const currentSpending = transactions
      .filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === currentMonth && d.getFullYear() === selectedYear && t.type === 'expense'
      })
      .reduce((a, t) => a + t.amount, 0)

    const prevSpending = transactions
      .filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear && t.type === 'expense'
      })
      .reduce((a, t) => a + t.amount, 0)

    const result = []

    if (prevSpending > 0) {
      const change = ((currentSpending - prevSpending) / prevSpending) * 100
      const direction = change > 0 ? '↑' : change < 0 ? '↓' : '→'
      const color = change > 15 ? 'negative' : change < -15 ? 'positive' : 'neutral'

      result.push({
        type: 'trend',
        icon: direction,
        title: 'השוואה לחודש שעבר',
        text: `הוצאות ${change > 0 ? 'גבוהות' : change < 0 ? 'נמוכות' : 'כמו'} ב-${Math.abs(change).toFixed(0)}%`,
        color
      })
    }

    const currentIncome = transactions
      .filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === currentMonth && d.getFullYear() === selectedYear && t.type === 'income'
      })
      .reduce((a, t) => a + t.amount, 0)

    const balance = currentIncome - currentSpending
    const savingsRate = currentIncome > 0 ? ((balance / currentIncome) * 100).toFixed(0) : 0

    result.push({
      type: 'savings',
      icon: '💰',
      title: 'קצב חיסכון',
      text: `${savingsRate}% מהכנסתך`,
      color: savingsRate > 20 ? 'positive' : savingsRate > 10 ? 'neutral' : 'negative'
    })

    return result
  }, [transactions, selectedMonth, selectedYear])

  if (insights.length === 0) return null

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>תובנות חודש</h3>
      <div className={styles.grid}>
        {insights.map((insight, i) => (
          <div key={i} className={`${styles.card} ${styles[insight.color]}`}>
            <span className={styles.icon}>{insight.icon}</span>
            <span className={styles.label}>{insight.title}</span>
            <span className={styles.value}>{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
