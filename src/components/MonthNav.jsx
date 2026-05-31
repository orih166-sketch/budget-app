import { MONTHS, USERS } from '../data.js'
import styles from './MonthNav.module.css'

const now = new Date()

export default function MonthNav({ month, year, onChange, selectedUser, onUserChange }) {
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

      {onUserChange && (
        <div className={styles.userRow}>
          <button
            className={`${styles.chip} ${styles.chipFamily} ${selectedUser === 'family' ? styles.chipActive : ''}`}
            onClick={() => onUserChange('family')}
          >כולם</button>
          {USERS.filter(u => u.id !== 'family').map(u => (
            <button
              key={u.id}
              className={`${styles.chip} ${selectedUser === u.id ? styles.chipActive : ''}`}
              style={selectedUser === u.id ? { background: u.color, borderColor: u.color } : { '--u-color': u.color }}
              onClick={() => onUserChange(u.id)}
            >
              <span className={styles.chipAvatar} style={{ background: u.color }}>{u.avatar}</span>
              {u.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
