import styles from './Navbar.module.css'

const TABS = [
  { id: 'reports',      label: 'דוחות',   icon: '📊' },
  { id: 'networth',     label: 'עושר',    icon: '💎' },
  { id: 'dashboard',    label: 'בית',     icon: '🏠' },
  { id: 'transactions', label: 'עסקאות', icon: '💳' },
  { id: 'settings',     label: 'הגדרות',  icon: '⚙️' },
]

export default function Navbar({ active, onChange }) {
  return (
    <nav className={styles.nav}>
      {TABS.map(t => (
        <button
          key={t.id}
          type="button"
          className={`${styles.item} ${active === t.id ? styles.active : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className={styles.icon}>{t.icon}</span>
          <span className={styles.label}>{t.label}</span>
          {active === t.id && <span className={styles.dot} />}
        </button>
      ))}
    </nav>
  )
}
