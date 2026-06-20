import { MONTHS, USERS } from '../data.js'
import styles from './MonthNav.module.css'

export default function MonthNav({ month, year, onChange, selectedUser, onUserChange }) {
  const now = new Date()
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear()

  function prev() {
    if (month === 0) onChange(11, year - 1)
    else onChange(month - 1, year)
  }

  function next() {
    if (isCurrentMonth) return
    if (month === 11) onChange(0, year + 1)
    else onChange(month + 1, year)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.monthRow}>
        <button className={styles.btn} onClick={next} disabled={isCurrentMonth} aria-label="חודש הבא">›</button>
        <span className={styles.label}>{MONTHS[month]} {year}</span>
        <button className={styles.btn} onClick={prev} aria-label="חודש קודם">‹</button>
      </div>

    </div>
  )
}
