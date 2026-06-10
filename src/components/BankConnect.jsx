import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useHousehold } from '../context/HouseholdContext.jsx'
import styles from './BankConnect.module.css'

const BANKS = [
  { id: 'discount', label: 'דיסקונט', icon: '🏦', fields: ['id', 'password'] },
]

const FIELD_LABELS = { id: 'תעודת זהות', password: 'סיסמה' }

const RANGE_OPTIONS = [
  { label: '3 חודשים אחרונים', months: 3 },
  { label: '6 חודשים אחרונים', months: 6 },
  { label: 'שנה אחרונה',       months: 12 },
]

export default function BankConnect({ onClose, onImported }) {
  const { household } = useHousehold()
  const [step, setStep]       = useState('form') // form | loading | done | error
  const [bank]                = useState(BANKS[0])
  const [creds, setCreds]     = useState({ id: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [months, setMonths]   = useState(3)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')
  const [phase, setPhase]     = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!creds.id || !creds.password) return

    setStep('loading')
    setError('')
    setPhase('מתחבר לבנק...')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('לא מחובר')

      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)

      setPhase('שולף עסקאות (עשוי לקחת עד דקה)...')

      const res = await fetch('/api/scrape-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: creds.id,
          password: creds.password,
          householdId: household.id,
          authToken: session.access_token,
          startDate: startDate.toISOString(),
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'שגיאה לא ידועה')

      setResult(data)
      setStep('done')
      onImported?.()
    } catch (err) {
      setError(err.message)
      setStep('error')
    }
  }

  return (
    <div className={styles.bg} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.bankBadge}>
            <span className={styles.bankIcon}>{bank.icon}</span>
            <span className={styles.bankName}>{bank.label}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── Form ── */}
        {step === 'form' && (
          <form onSubmit={submit} className={styles.form}>
            <div className={styles.notice}>
              <span className={styles.noticeIcon}>🔒</span>
              <p>הסיסמה מועברת ישירות לבנק ו<strong>לא נשמרת</strong> אצלנו.</p>
            </div>

            <div className={styles.fieldWrap}>
              <label className={styles.label}>תעודת זהות</label>
              <input className={styles.input} type="text" inputMode="numeric"
                placeholder="XXXXXXXXX" dir="ltr" required
                value={creds.id} onChange={e => setCreds(c => ({ ...c, id: e.target.value }))} />
            </div>

            <div className={styles.fieldWrap}>
              <label className={styles.label}>סיסמה</label>
              <div className={styles.passWrap}>
                <input className={styles.input} type={showPass ? 'text' : 'password'}
                  placeholder="סיסמת הבנק" dir="ltr" required
                  value={creds.password} onChange={e => setCreds(c => ({ ...c, password: e.target.value }))} />
                <button type="button" className={styles.eyeBtn} tabIndex={-1}
                  onClick={() => setShowPass(v => !v)}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className={styles.fieldWrap}>
              <label className={styles.label}>טווח זמן</label>
              <div className={styles.rangeRow}>
                {RANGE_OPTIONS.map(o => (
                  <button key={o.months} type="button"
                    className={`${styles.rangeBtn} ${months === o.months ? styles.rangeActive : ''}`}
                    onClick={() => setMonths(o.months)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className={styles.submitBtn}>
              סנכרן עסקאות ←
            </button>
          </form>
        )}

        {/* ── Loading ── */}
        {step === 'loading' && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p className={styles.phase}>{phase}</p>
            <p className={styles.phaseSub}>זה עשוי לקחת עד דקה, אל תסגור את החלון</p>
          </div>
        )}

        {/* ── Done ── */}
        {step === 'done' && result && (
          <div className={styles.doneWrap}>
            <div className={styles.doneIcon}>✓</div>
            <h3 className={styles.doneTitle}>הסנכרון הצליח!</h3>
            <p className={styles.doneSub}>
              נוספו <strong>{result.added}</strong> עסקאות חדשות
              {result.total > result.added
                ? ` (${result.total - result.added} כבר היו קיימות)`
                : ''}
            </p>
            {result.accounts?.map(a => (
              <div key={a.number} className={styles.accountRow}>
                <span>חשבון {a.number}</span>
                <span>{a.txns} עסקאות</span>
              </div>
            ))}
            <button className={styles.submitBtn} onClick={onClose}>סגור</button>
          </div>
        )}

        {/* ── Error ── */}
        {step === 'error' && (
          <div className={styles.errorWrap}>
            <div className={styles.errorIcon}>✕</div>
            <h3 className={styles.errorTitle}>הסנכרון נכשל</h3>
            <p className={styles.errorMsg}>{error}</p>
            <button className={styles.submitBtn} onClick={() => setStep('form')}>נסה שוב</button>
          </div>
        )}
      </div>
    </div>
  )
}
