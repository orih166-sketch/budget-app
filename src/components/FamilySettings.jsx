import { useState } from 'react'
import { useHousehold } from '../context/HouseholdContext.jsx'
import styles from './FamilySettings.module.css'

export default function FamilySettings({ user, onClose }) {
  const { household, members, loading: householdLoading, invitePartner } = useHousehold()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | 'error'
  const [errMsg, setErrMsg] = useState('')

  async function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setErrMsg('')
    try {
      await invitePartner(email.trim())
      setStatus('sent')
      setEmail('')
    } catch (err) {
      setErrMsg(err.message || 'שגיאה בשליחת ההזמנה')
      setStatus('error')
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />

        <div className={styles.header}>
          <h2 className={styles.title}>הגדרות משפחה</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {household && (
          <div className={styles.householdName}>
            <span className={styles.householdIcon}>🏠</span>
            <span>{household.name}</span>
          </div>
        )}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>בני המשפחה</h3>
          <div className={styles.memberList}>
            {members.map(m => (
              <div key={m.user_id} className={styles.memberRow}>
                <div className={styles.memberAvatar}>
                  {m.user_id === user.uid ? user.avatar : '?'}
                </div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>
                    {m.user_id === user.uid ? user.name : 'בן/בת זוג'}
                  </span>
                  <span className={styles.memberRole}>
                    {m.role === 'owner' ? 'בעל/ת חשבון' : 'חבר/ת משפחה'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {members.length < 2 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>הזמן/י בן/בת זוג</h3>
            <p className={styles.inviteDesc}>
              שלח/י קישור הצטרפות למייל של בן/בת זוגך. לאחר שיצטרף/ו, תוכלו לנהל יחד את תקציב הבית.
            </p>

            {status === 'sent' ? (
              <div className={styles.successBox}>
                <span>✓</span>
                <span>ההזמנה נשלחה! הם יקבלו מייל עם קישור להצטרפות.</span>
              </div>
            ) : (
              <form className={styles.inviteForm} onSubmit={handleInvite}>
                <input
                  className={styles.emailInput}
                  type="email"
                  placeholder="כתובת המייל של בן/בת זוגך"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  dir="ltr"
                  required
                  disabled={status === 'sending'}
                />
                <button
                  className={styles.inviteBtn}
                  type="submit"
                  disabled={status === 'sending' || !email.trim() || householdLoading || !household}
                >
                  {status === 'sending' ? '...' : 'שלח/י הזמנה'}
                </button>
              </form>
            )}

            {status === 'error' && (
              <p className={styles.errorMsg}>{errMsg}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
