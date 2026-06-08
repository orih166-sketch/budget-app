import { useState } from 'react'
import styles from './AlertBanner.module.css'

export default function AlertBanner({ alerts }) {
  const [dismissed, setDismissed] = useState(new Set())

  if (!alerts || alerts.length === 0) return null

  const visible = alerts.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className={styles.container}>
      {visible.map(alert => (
        <div key={alert.id} className={`${styles.alert} ${styles[alert.severity]}`}>
          <div className={styles.content}>
            <span className={styles.icon}>{alert.severity === 'critical' ? '🔴' : '🟡'}</span>
            <span className={styles.message}>{alert.message}</span>
          </div>
          <button
            className={styles.close}
            onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
            title="Close alert"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
