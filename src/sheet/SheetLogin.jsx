import { useState, useEffect } from 'react'
import Mark from './Mark.jsx'
import s from './sheet.module.css'

const hebrew = msg => {
  const m = String(msg || '')
  if (/invalid login|invalid credentials/i.test(m)) return 'המייל או הסיסמה לא נכונים'
  if (/email not confirmed/i.test(m)) return 'צריך לאשר את המייל קודם (בדוק את תיבת הדואר)'
  if (/already registered|already exists/i.test(m)) return 'כבר יש חשבון עם המייל הזה — אפשר להתחבר'
  if (/password should be|at least 6/i.test(m)) return 'הסיסמה צריכה להיות לפחות 6 תווים'
  if (/rate limit|too many/i.test(m)) return 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות'
  if (/network|fetch/i.test(m)) return 'אין חיבור לאינטרנט'
  return m || 'משהו השתבש, נסה שוב'
}

/** מסך הכניסה בעיצוב החדש (קרם וזית). אותה התחברות של Supabase כמו קודם. */
export default function SheetLogin({ onLogin, onRegister, onSendResetCode, onLoginWithGoogle }) {
  const [mode, setMode] = useState('login') // login | register | reset | reset-done
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.style.background = document.body.style.background = dark ? '#15160F' : '#F7F5EC'
  }, [])

  const to = m => { setMode(m); setErr(''); setOk('') }

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setErr(''); setOk('')
    try {
      if (mode === 'login') await onLogin(email.trim(), pass)
      else if (mode === 'register') {
        if (!name.trim()) throw new Error('צריך שם')
        await onRegister(email.trim(), pass, name.trim())
        setOk('החשבון נוצר. שלחנו מייל לאישור — אחרי האישור אפשר להתחבר.')
      } else if (mode === 'reset') { await onSendResetCode(email.trim()); to('reset-done') }
    } catch (e2) { setErr(hebrew(e2.message)) } finally { setBusy(false) }
  }

  async function google() {
    setErr('')
    try { await onLoginWithGoogle() } catch (e2) { setErr(hebrew(e2.message)) }
  }

  return (
    <div className={s.app}>
      <div className={s.screen} style={{ maxWidth: 420, minHeight: '100dvh', justifyContent: 'center', paddingBottom: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <Mark size={84} />
          <h1 className={s.h1} style={{ fontSize: 28 }}>כלכלת בית</h1>
          <span className={s.muted}>התקציב המשפחתי שלכם, בלי מינוס</span>
        </div>

        {mode === 'reset-done' ? (
          <div className={s.card} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center' }}>
            <span className={s.name}>שלחנו קישור לאיפוס הסיסמה</span>
            <span className={s.muted} dir="ltr">{email}</span>
            <span className={s.small}>לא הגיע? כדאי לבדוק בתיקיית הספאם.</span>
            <button type="button" className={s.link} onClick={() => to('login')}>חזרה לכניסה</button>
          </div>
        ) : (
          <form className={s.card} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={submit}>
            {mode === 'register' && (
              <div className={s.field}>
                <label htmlFor="l-name" className={s.fieldLabel}>שם</label>
                <input id="l-name" className={s.input} autoComplete="given-name" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div className={s.field}>
              <label htmlFor="l-email" className={s.fieldLabel}>מייל</label>
              <input id="l-email" className={s.input} type="email" dir="ltr" autoComplete="email" inputMode="email" required
                value={email} onChange={e => setEmail(e.target.value)} placeholder="name@gmail.com" />
            </div>
            {mode !== 'reset' && (
              <div className={s.field}>
                <label htmlFor="l-pass" className={s.fieldLabel}>סיסמה</label>
                <input id="l-pass" className={s.input} type="password" dir="ltr" required minLength={6}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={pass} onChange={e => setPass(e.target.value)} />
              </div>
            )}
            {err && <p className={s.errMsg} role="alert">{err}</p>}
            {ok && <p className={s.okMsg} role="status">{ok}</p>}
            <button type="submit" className={s.primary} style={{ height: 52 }} disabled={busy}>
              {busy ? 'רגע…' : mode === 'login' ? 'כניסה' : mode === 'register' ? 'יצירת חשבון' : 'שליחת קישור לאיפוס'}
            </button>
            {mode === 'login' && (
              <>
                <div className={s.row} style={{ gap: 10 }} aria-hidden="true">
                  <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                  <span className={s.small}>או</span>
                  <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                </div>
                <button type="button" className={s.secondary} style={{ height: 50, color: 'var(--text)' }} onClick={google}>
                  <span className={s.row} style={{ justifyContent: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                    </svg>
                    המשך עם Google
                  </span>
                </button>
              </>
            )}
          </form>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
          {mode !== 'login' && <button type="button" className={s.link} onClick={() => to('login')}>יש לי חשבון — כניסה</button>}
          {mode === 'login' && <button type="button" className={s.link} onClick={() => to('reset')}>שכחתי סיסמה</button>}
          {mode === 'login' && <button type="button" className={s.link} onClick={() => to('register')}>אין לי חשבון</button>}
        </div>
      </div>
    </div>
  )
}
