import { useState } from 'react'
import { callSheet, notifyChanged } from './api.js'
import { money, ddmm, ymd, MONTHS, parseYmd } from './format.js'
import s from './sheet.module.css'

/**
 * "כמה עוד אפשר להוציא": המרווח בין היתרה הכי נמוכה שצפויה בבנק לבין כרית הביטחון.
 * התחזית כבר כוללת את החיובים שבדרך ואת קצב ההוצאות הרגיל.
 */
export function SafeCard({ cf }) {
  const [why, setWhy] = useState(false)
  if (!cf || cf.margin === undefined) return null
  const ok = cf.margin >= 0
  const until = `${parseYmd(cf.minDate).getDate()} ב${MONTHS[parseYmd(cf.minDate).getMonth()]}`

  return (
    <section className={`${s.safe} ${ok ? '' : s.safeWarn}`} aria-label="כמה עוד אפשר להוציא">
      <span className={s.safeLabel}>{ok ? 'כמה עוד אפשר להוציא' : 'כמה צריך לחסוך'}</span>
      <span className={s.safeNum}>{money(Math.abs(cf.margin))}</span>
      <span className={s.safeSub} style={{ fontSize: 15 }}>
        {ok
          ? `ועדיין יישארו בבנק לפחות ${money(cf.cushion)}.`
          : `כדי שלא יישארו בבנק פחות מ-${money(cf.cushion)}.`}
      </span>
      <button type="button" onClick={() => setWhy(w => !w)} aria-expanded={why}
        style={{ alignSelf: 'flex-start', background: 'none', border: 0, padding: '4px 0', color: 'inherit', font: 'inherit', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', opacity: .9 }}>
        {why ? 'הסתרת ההסבר' : 'איך זה מחושב?'}
      </button>
      {why && (
        <span className={s.safeSub}>
          לקחנו את מה שיש היום בבנק, הורדנו את כל מה שעוד יירד מהחשבון (חיובי האשראי, המשכנתא, הוראות הקבע
          והוצאות רגילות כמו בחודש האחרון) והוספנו את המשכורות. לפי זה, היתרה הכי נמוכה תהיה {money(cf.minValue)}, ב-{until}.
          {ok
            ? ` זה ${money(cf.margin)} מעל הכרית של ${money(cf.cushion)} — וזה הסכום שאפשר להוציא בנוסף.`
            : ` זה ${money(-cf.margin)} מתחת לכרית של ${money(cf.cushion)} — את הסכום הזה כדאי לחסוך עד אז.`}
        </span>
      )}
    </section>
  )
}

/** בקשה לעדכן את יתרת הבנק, כשהיא ישנה משבוע. */
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
      setMsg({ ok: true, text: 'עודכן. החישוב מעודכן עכשיו.' }); setVal('')
      notifyChanged()
    } catch (err) { setMsg({ ok: false, text: err.message }) } finally { setBusy(false) }
  }

  const old = cf.balanceAge >= 7
  return (
    <form className={old ? s.banner : s.card} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: 14 }} onSubmit={save}>
      <label htmlFor="bal-now" className={s.nameCol}>
        <span className={s.name}>כמה כסף יש עכשיו בבנק?</span>
        <span className={s.small}>
          {old ? `עודכן לאחרונה לפני ${cf.balanceAge} ימים (${ddmm(cf.balanceDate)}). ` : ''}
          מעתיקים את היתרה מהאפליקציה של הבנק. כדאי פעם בשבוע, כדי שהחישוב יהיה נכון.
        </span>
      </label>
      <div className={s.inlineForm}>
        <input id="bal-now" className={s.input} inputMode="decimal" placeholder="היתרה בעו״ש" value={val} onChange={e => setVal(e.target.value)} />
        <button type="submit" className={s.primary} disabled={busy}>{busy ? 'שומר…' : 'עדכון'}</button>
      </div>
      {msg && <span className={msg.ok ? s.okMsg : s.errMsg} role="status">{msg.text}</span>}
    </form>
  )
}
