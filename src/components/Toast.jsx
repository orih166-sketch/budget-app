import { useEffect } from 'react'
import styles from './Toast.module.css'

export default function Toast({ message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [message])

  if (!message) return null

  return (
    <div className={styles.toast} onClick={onClose}>
      <span className={styles.icon}>⚠</span>
      <span className={styles.msg}>{message}</span>
      <button className={styles.close}>✕</button>
    </div>
  )
}
