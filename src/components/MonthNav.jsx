import { useState } from 'react'
import { MONTHS } from '../data.js'
import styles from './MonthNav.module.css'

export default function MonthNav({ month, year, onChange }) {
  const now = new Date()
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear()
  const [showGrid, setShowGrid] = useState(false)

  function prev() {
    if (month === 0) onChange(11, year - 1)
    else onChange(month - 1, year)
  }

  function next() {
    if (isCurrentMonth) return
    if (month === 11) onChange(0, year + 1)
    else onChange(month + 1, year)
  }

  function pickMonth(m) {
    onChange(m, year)
    setShowGrid(false)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <button type="button" className={styles.btn} onClick={prev} aria-label="חודש קודם">‹</button>
        <button type="button" className={styles.label} onClick={() => setShowGrid(v => !v)}>
          {MONTHS[month]} {year}
        </button>
        <button type="button" className={styles.btn} onClick={next} disabled={isCurrentMonth} aria-label="חודש הבא">›</button>
      </div>

      {showGrid && (
        <div className={styles.grid}>
          {MONTHS.map((name, i) => (
            <button
              key={name}
              type="button"
              className={`${styles.gridItem} ${i === month ? styles.gridActive : ''}`}
              onClick={() => pickMonth(i)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
