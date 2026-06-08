import { useState } from 'react'
import styles from './Login.module.css'

export default function Login({ onLogin, onRegister, onSendResetCode, onVerifyCode }) {
  const [mode, setMode]       = useState('login')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [code, setCode]       = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(m) { setMode(m); setError(''); setSuccess('') }

  async function submit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await onLogin(email, pass)
      } else if (mode === 'register') {
        if (!name.trim()) { setError('נא להזין שם'); return }
        await onRegister(email, pass, name.trim())
      } else if (mode === 'reset-email') {
        await onSendResetCode(email)
        switchMode('reset-code')
      } else if (mode === 'reset-code') {
        if (code.length !== 6) { setError('הקוד חייב להיות 6 ספרות'); return }
        await onVerifyCode(email, code)
        switchMode('reset-done')
      }
    } catch (err) {
      setError(hebrewError(err.message))
    } finally {
      setLoading(false)
    }
  }

  const isReset = mode.startsWith('reset')

  if (mode === 'reset-done') {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>הזהות אומתה!</h1>
          <p className={styles.doneSub}>
            שלחנו לכתובת <strong dir="ltr">{email}</strong> לינק לשינוי הסיסמה.<br/>
            לחץ על הלינק במייל כדי לקבוע סיסמה חדשה.
          </p>
          <p className={styles.doneNote}>לא קיבלת? בדוק ספאם</p>
          <button className={styles.submit} onClick={() => switchMode('login')}>
            חזרה לכניסה
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>₪</div>
        <h1 className={styles.title}>תקציב הבית</h1>
        <p className={styles.sub}>
          {mode === 'login' ? 'התחברות לחשבון'
            : mode === 'register' ? 'יצירת חשבון חדש'
            : mode === 'reset-email' ? 'שכחתי סיסמה'
            : 'הזן את הקוד'}
        </p>

        {!isReset && (
          <div className={styles.modeToggle}>
            <button type="button"
              className={`${styles.modeBtn} ${mode==='login' ? styles.modeActive : ''}`}
              onClick={() => switchMode('login')}>כניסה</button>
            <button type="button"
              className={`${styles.modeBtn} ${mode==='register' ? styles.modeActive : ''}`}
              onClick={() => switchMode('register')}>הרשמה</button>
          </div>
        )}

        {isReset && (
          <div className={styles.steps}>
            {['reset-email','reset-code'].map((s, i) => (
              <div key={s} className={`${styles.step} ${mode===s ? styles.stepActive : ''} ${stepDone(mode, s) ? styles.stepDone : ''}`}>
                {stepDone(mode, s) ? '✓' : i + 1}
              </div>
            ))}
          </div>
        )}

        <form className={styles.form} onSubmit={submit}>
          {mode === 'register' && (
            <input className={styles.input} type="text" placeholder="שם מלא"
              value={name} onChange={e => setName(e.target.value)} autoComplete="name" required />
          )}

          {(mode === 'login' || mode === 'register' || mode === 'reset-email') && (
            <input className={styles.input} type="email" placeholder="כתובת מייל"
              value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email" required dir="ltr" />
          )}

          {(mode === 'login' || mode === 'register') && (
            <input className={styles.input} type="password"
              placeholder="סיסמה (לפחות 6 תווים)"
              value={pass} onChange={e => setPass(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required dir="ltr" />
          )}

          {mode === 'reset-code' && (
            <>
              <p className={styles.codeSub}>שלחנו קוד 6 ספרות אל <strong dir="ltr">{email}</strong></p>
              <input className={`${styles.input} ${styles.codeInput}`}
                type="text" inputMode="numeric" pattern="[0-9]{6}"
                placeholder="000000" maxLength={6}
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                autoComplete="one-time-code" dir="ltr" autoFocus required />
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? '...'
              : mode === 'login' ? 'כניסה'
              : mode === 'register' ? 'יצירת חשבון'
              : mode === 'reset-email' ? 'שלח קוד למייל'
              : 'אמת קוד'}
          </button>
        </form>

        {mode === 'login' && (
          <button type="button" className={styles.forgotBtn} onClick={() => switchMode('reset-email')}>
            שכחתי סיסמה
          </button>
        )}
        {isReset && (
          <button type="button" className={styles.forgotBtn} onClick={() => switchMode('login')}>
            ← חזרה לכניסה
          </button>
        )}
        {mode === 'reset-code' && (
          <button type="button" className={styles.resendBtn}
            onClick={async () => {
              try { await onSendResetCode(email); setSuccess('קוד חדש נשלח') }
              catch { setError('שגיאה בשליחה') }
            }}>
            לא קיבלתי — שלח שוב
          </button>
        )}
      </div>
    </div>
  )
}

function stepDone(current, step) {
  return ['reset-email','reset-code'].indexOf(current) > ['reset-email','reset-code'].indexOf(step)
}

function hebrewError(msg = '') {
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) return 'מייל או סיסמה שגויים'
  if (msg.includes('User already registered') || msg.includes('already')) return 'כתובת המייל כבר קיימת'
  if (msg.includes('Password should be')) return 'סיסמה חייבת להכיל לפחות 6 תווים'
  if (msg.includes('expired')) return 'הקוד פג תוקף — שלח קוד חדש'
  if (msg.includes('invalid') || msg.includes('Token')) return 'קוד שגוי — נסה שוב'
  if (msg.includes('too many') || msg.includes('rate')) return 'יותר מדי ניסיונות — נסה שוב מאוחר יותר'
  return msg || 'אירעה שגיאה, נסה שוב'
}
