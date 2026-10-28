import { useState } from 'react'
import { callSheet, notifyChanged } from './api.js'
import { money, ddmm, ymd } from './format.js'
import s from './sheet.module.css'

/** "כמה אפשר להוציא": המרווח בין הנקודה הנמוכה בתחזית לבין כרית הביטחון. */
export function SafeCard({ cf }) {
  if (!cf || cf.margin === undefined) return null
  const ok = cf.margin >= 0
  const inc = cf.nextIncome
  return (
    <section className={`${s.safe} ${ok ? '' : s.safeWarn}`} aria-label="כמה אפשר להוציא">
      <span className={s.safeLabel}>{ok ? 'אפשר להוציא עוד' : 'צריך לצמצם'}</span>
      <span className={s.safeNum}>{money(Math.abs(cf.margin))}</span>
      <span className={s.safeSub}>
        {ok
          ? `מעבר לקצב הרגיל, בלי לרדת מתחת לכרית של ${money(cf.cushion)}. הנקודה הנמוכה בחשבון: ${money(cf.minValue)} ב-${ddmm(cf.minDate)}.`
          : `בקצב הנוכחי היתרה תרד ל-${money(cf.minValue)} ב-${ddmm(cf.minDate)}, מתחת לכרית של ${money(cf.cushion)}.`}
        {inc && ok ? ` המשכורת הבאה בעוד ${inc.days} ימים.` : ''}
      </span>
    </section>
  )
}

/** תזכורת + עדכון מהיר של יתרת העו"ש, כשהיא ישנה משבוע. */
export function BalanceNudge({ cf, always = false }) {
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  if (!cf || (!always && cf.balanceAge < 7)) return null

  async function save(e) {
    e.preventDefault()
    const n = Number(String(val).replace(/[,₪\s]/g, ''))
    if (!val.trim() || Number.isNaN(n)) return
    setBusy(true); setMsg(null)
    try {
      await callSheet('setBalance', { balance: n, date: ymd(new Date()) })
      setMsg({ ok: true, text: 'עודכן, התחזית חושבה מחדש' }); setVal('')
      notifyChanged()
    } catch (err) { setMsg({ ok: false, text: err.message }) } finally { setBusy(false) }
  }

  return (
    <form className={cf.balanceAge >= 7 ? s.banner : s.card} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: 14 }} onSubmit={save}>
      <label htmlFor="bal-now" className={s.nameCol}>
        <span className={s.name} style={cf.balanceAge >= 7 ? { color: 'var(--warn)' } : null}>
          {cf.balanceAge >= 7 ? `יתרת הבנק עודכנה לפני ${cf.balanceAge} ימים` : 'עדכון יתרת הבנק'}
        </span>
        <span className={s.small}>כמה יש עכשיו בעו"ש? (מהאפליקציה של הבנק) — כך התחזית נשארת מדויקת</span>
      </label>
      <div className={s.inlineForm}>
        <input id="bal-now" className={s.input} inputMode="decimal" placeholder="למשל 31,250" value={val} onChange={e => setVal(e.target.value)} />
        <button type="submit" className={s.primary} disabled={busy}>{busy ? 'שומר…' : 'עדכון'}</button>
      </div>
      {msg && <span className={msg.ok ? s.okMsg : s.errMsg} role="status">{msg.text}</span>}
    </form>
  )
}
