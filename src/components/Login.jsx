import { useState } from 'react'
import styles from './Login.module.css'

export default function Login({ onLogin, onRegister, onSendResetCode, onLoginWithGoogle, onSendPhoneOtp, onVerifyPhoneOtp }) {
  const [mode, setMode]     = useState('login') // login | register | reset-email | reset-done | phone | phone-otp
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [phone, setPhone]   = useState('')
  const [otp, setOtp]       = useState('')
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(m) { setMode(m); setError(''); setSuccess(''); setOtp('') }

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
        setSuccess('החשבון נוצר! בדוק את המייל לאישור')
      } else if (mode === 'reset-email') {
        await onSendResetCode(email)
        switchMode('reset-done')
      } else if (mode === 'phone') {
        const formatted = formatPhone(phone)
        await onSendPhoneOtp(formatted)
        switchMode('phone-otp')
      } else if (mode === 'phone-otp') {
        await onVerifyPhoneOtp(formatPhone(phone), otp)
      }
    } catch (err) {
      setError(hebrewError(err.message))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    try { await onLoginWithGoogle() }
    catch (err) { setError(hebrewError(err.message)) }
  }

  if (mode === 'reset-done') {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.title}>נשלח!</h2>
          <p className={styles.doneSub}>שלחנו קישור לאיפוס לכתובת<br /><strong dir="ltr">{email}</strong></p>
          <p className={styles.doneNote}>לא קיבלת? בדוק ספאם</p>
          <button className={styles.submit} onClick={() => switchMode('login')}>חזרה לכניסה</button>
        </div>
      </div>
    )
  }

  const isReset = mode.startsWith('reset')
  const isPhone = mode === 'phone' || mode === 'phone-otp'

  return (
    <div className={styles.wrap}>
      <div className={styles.bgGlow} />

      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <img src="/Gemini_Generated_Image_36zavc36zavc36za.png" alt="כלכלת בית" className={styles.logoImg} />
        </div>
        <p className={styles.sub}>
          {mode === 'login'     ? 'ברוך הבא'
           : mode === 'register' ? 'צור חשבון חדש'
           : mode === 'phone'    ? 'כניסה עם טלפון'
           : mode === 'phone-otp'? `קוד נשלח ל-${phone}`
           : isReset             ? 'איפוס סיסמה'
           : ''}
        </p>

        {/* Mode toggle — only for login/register */}
        {!isReset && !isPhone && (
          <div className={styles.toggle}>
            <button type="button"
              className={`${styles.toggleBtn} ${mode === 'login' ? styles.toggleActive : ''}`}
              onClick={() => switchMode('login')}>כניסה</button>
            <button type="button"
              className={`${styles.toggleBtn} ${mode === 'register' ? styles.toggleActive : ''}`}
              onClick={() => switchMode('register')}>הרשמה</button>
          </div>
        )}

        {/* Social / phone buttons — only on login/register */}
        {!isReset && !isPhone && (
          <div className={styles.socialRow}>
            <button type="button" className={styles.googleBtn} onClick={handleGoogle}>
              <GoogleIcon />
              המשך עם Google
            </button>
          </div>
        )}

        {!isReset && !isPhone && <div className={styles.divider}><span>או</span></div>}

        <form className={styles.form} onSubmit={submit}>
          {mode === 'register' && (
            <div className={styles.fieldWrap}>
              <label className={styles.label}>שם מלא</label>
              <input className={styles.input} type="text" placeholder="אורי הראל"
                value={name} onChange={e => setName(e.target.value)} autoComplete="name" required />
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'reset-email') && (
            <div className={styles.fieldWrap}>
              <label className={styles.label}>כתובת מייל</label>
              <input className={styles.input} type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="email" required dir="ltr" />
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className={styles.fieldWrap}>
              <label className={styles.label}>סיסמה</label>
              <input className={styles.input} type="password"
                placeholder="לפחות 6 תווים"
                value={pass} onChange={e => setPass(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required dir="ltr" />
            </div>
          )}

          {mode === 'phone' && (
            <div className={styles.fieldWrap}>
              <label className={styles.label}>מספר טלפון</label>
              <input className={styles.input} type="tel" placeholder="050-0000000"
                value={phone} onChange={e => setPhone(e.target.value)}
                autoComplete="tel" required dir="ltr" />
            </div>
          )}

          {mode === 'phone-otp' && (
            <>
              <p className={styles.otpSub}>הזן את הקוד בן 6 הספרות שנשלח אליך</p>
              <input className={`${styles.input} ${styles.otpInput}`}
                type="text" inputMode="numeric" pattern="[0-9]*"
                placeholder="000000" maxLength={6}
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))}
                dir="ltr" required autoFocus />
            </>
          )}

          {error   && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? <span className={styles.spinner} /> :
              mode === 'login'     ? 'כניסה'
            : mode === 'register'  ? 'יצירת חשבון'
            : mode === 'phone'     ? 'שלח קוד'
            : mode === 'phone-otp' ? 'אימות'
            : 'שלח קישור לאיפוס'}
          </button>
        </form>

        <div className={styles.footer}>
          {mode === 'login' && (
            <button type="button" className={styles.textBtn} onClick={() => switchMode('reset-email')}>
              שכחתי סיסמה
            </button>
          )}
          {(isReset || isPhone) && (
            <button type="button" className={styles.textBtn} onClick={() => switchMode('login')}>
              ← חזרה לכניסה
            </button>
          )}
          {mode === 'phone-otp' && (
            <button type="button" className={styles.textBtn} onClick={() => { setOtp(''); switchMode('phone') }}>
              שלח קוד מחדש
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function formatPhone(p) {
  const digits = p.replace(/\D/g, '')
  if (digits.startsWith('0')) return '+972' + digits.slice(1)
  if (digits.startsWith('972')) return '+' + digits
  return '+972' + digits
}

function hebrewError(msg = '') {
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) return 'מייל או סיסמה שגויים'
  if (msg.includes('User already registered') || msg.includes('already')) return 'כתובת המייל כבר קיימת'
  if (msg.includes('Password should be')) return 'סיסמה חייבת להכיל לפחות 6 תווים'
  if (msg.includes('expired')) return 'הקוד פג תוקף — שלח קוד חדש'
  if (msg.includes('invalid') || msg.includes('Token')) return 'קוד שגוי — נסה שוב'
  if (msg.includes('too many') || msg.includes('rate')) return 'יותר מדי ניסיונות — נסה שוב מאוחר יותר'
  if (msg.includes('Phone') || msg.includes('phone')) return 'מספר טלפון לא תקין'
  if (msg.includes('not enabled') || msg.includes('provider')) return 'ספק כניסה זה לא מוגדר — פנה לתמיכה'
  return msg || 'אירעה שגיאה, נסה שוב'
}
