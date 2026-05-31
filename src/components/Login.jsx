import { useState } from 'react'
import styles from './Login.module.css'

export default function Login({ onLogin, onRegister }) {
  const [mode, setMode]       = useState('login')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await onLogin(email, pass)
      } else {
        if (!name.trim()) { setError('נא להזין שם'); setLoading(false); return }
        await onRegister(email, pass, name.trim())
      }
    } catch (err) {
      setError(hebrewError(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>₪</div>
        <h1 className={styles.title}>תקציב הבית</h1>
        <p className={styles.sub}>{mode === 'login' ? 'התחברות לחשבון' : 'יצירת חשבון חדש'}</p>

        <div className={styles.modeToggle}>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode==='login' ? styles.modeActive : ''}`}
            onClick={() => { setMode('login'); setError('') }}>
            כניסה
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode==='register' ? styles.modeActive : ''}`}
            onClick={() => { setMode('register'); setError('') }}>
            הרשמה
          </button>
        </div>

        <form className={styles.form} onSubmit={submit}>
          {mode === 'register' && (
            <input
              className={styles.input}
              type="text"
              placeholder="שם מלא"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              required
            />
          )}
          <input
            className={styles.input}
            type="email"
            placeholder="כתובת מייל"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
            dir="ltr"
          />
          <input
            className={styles.input}
            type="password"
            placeholder="סיסמה (לפחות 6 תווים)"
            value={pass}
            onChange={e => setPass(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            dir="ltr"
          />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'כניסה' : 'יצירת חשבון'}
          </button>
        </form>
      </div>
    </div>
  )
}

function hebrewError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'מייל או סיסמה שגויים'
    case 'auth/email-already-in-use':  return 'כתובת המייל כבר קיימת במערכת'
    case 'auth/weak-password':         return 'הסיסמה חייבת להכיל לפחות 6 תווים'
    case 'auth/invalid-email':         return 'כתובת מייל לא תקינה'
    case 'auth/too-many-requests':     return 'יותר מדי ניסיונות — נסה שוב מאוחר יותר'
    default:                           return 'אירעה שגיאה, נסה שוב'
  }
}
