import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { useSheet, callSheet } from './api.js'
import { pushSupport, currentSubscription, enablePush, disablePush } from './push.js'
import { money, ymd } from './format.js'
import { Toggle } from './ui.jsx'
import s from './sheet.module.css'

const RULES = [
  ['near', 'קטגוריה הגיעה לסף ההתראה (בדרך כלל 85%)'],
  ['over', 'חריגה מהתקציב'],
  ['minus', 'צפוי מינוס בחשבון'],
  ['charge', 'ערב לפני חיוב גדול'],
  ['apple', 'הוצאה שנרשמה מ-Apple Pay'],
]

export default function Alerts({ back }) {
  const month = useSheet('month', { month: ymd(new Date()).slice(0, 7) })
  const [info, setInfo] = useState(null)
  const [onDevice, setOnDevice] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const support = pushSupport()

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const sub = await currentSubscription().catch(() => null)
        const data = await callSheet('pushGet', { endpoint: sub?.endpoint })
        if (!live) return
        setInfo(data)
        setOnDevice(!!sub && data.subscribed)
      } catch (e) { if (live) setMsg({ ok: false, text: e.message }) }
    })()
    return () => { live = false }
  }, [])

  async function run(fn, okText) {
    setBusy(true); setMsg(null)
    try {
      const data = await fn()
      if (data?.prefs) setInfo(data)
      if (okText) setMsg({ ok: true, text: okText })
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }

  const toggleDevice = () => onDevice
    ? run(async () => { const d = await disablePush(); setOnDevice(false); return d }, 'ההתראות כובו במכשיר הזה')
    : run(async () => { const d = await enablePush(); setOnDevice(true); return d }, 'ההתראות הופעלו במכשיר הזה')

  const setPref = (k, v) => {
    setInfo(i => ({ ...i, prefs: { ...i.prefs, [k]: v } }))
    run(() => callSheet('pushPrefs', { prefs: { [k]: v } }))
  }

  const current = alertsNow(month.data)

  return (
    <div className={s.screen}>
      <div className={s.topbar}>
        <div className={s.row}>
          <button type="button" className={s.iconBtn} aria-label="חזרה" onClick={back}><ChevronRight size={18} aria-hidden="true" /></button>
          <h1 className={s.h1}>התראות</h1>
        </div>
      </div>

      <span className={s.sectionLabel}>התראות פוש בטלפון</span>
      <div className={s.rows}>
        {support === 'ok' && (
          <div className={s.rowItem}>
            <div className={s.nameCol}>
              <span className={s.name}>התראות במכשיר הזה</span>
              <span className={s.small}>{onDevice ? 'מופעל · מופיע גם במסך הנעילה' : 'כבוי'}{info?.devices ? ` · ${info.devices} מכשירים רשומים לך` : ''}</span>
            </div>
            <Toggle on={onDevice} label="התראות במכשיר הזה" onChange={toggleDevice} disabled={busy} />
          </div>
        )}
        {support === 'needs-home-screen' && (
          <div className={s.rowItem}>
            <div className={s.nameCol}>
              <span className={s.name}>קודם מוסיפים למסך הבית</span>
              <span className={s.small}>באייפון אפשר לקבל התראות רק מאפליקציה שנפתחת ממסך הבית: בספארי לוחצים "שיתוף" ואז "הוספה למסך הבית", ופותחים משם.</span>
            </div>
          </div>
        )}
        {support === 'denied' && (
          <div className={s.rowItem}>
            <div className={s.nameCol}>
              <span className={s.name}>ההתראות חסומות</span>
              <span className={s.small}>בהגדרות הטלפון ← התראות ← כלכלת בית, מאשרים "אפשר התראות".</span>
            </div>
          </div>
        )}
        {support === 'unsupported' && <div className={s.rowItem}><span className={s.small}>הדפדפן הזה לא תומך בהתראות.</span></div>}
        {onDevice && (
          <div className={s.rowItem}>
            <button type="button" className={s.secondary} disabled={busy} onClick={() => run(() => callSheet('pushTest'), 'נשלחה התראת ניסיון')}>שליחת התראת ניסיון</button>
          </div>
        )}
      </div>
      {msg && <p className={msg.ok ? s.okMsg : s.errMsg} role="status">{msg.text}</p>}

      <span className={s.sectionLabel}>על מה להתריע</span>
      <div className={s.rows}>
        {RULES.map(([k, label]) => (
          <div key={k} className={s.rowItem}>
            <span className={s.nameCol}><span style={{ fontSize: 14 }}>{label}</span></span>
            <Toggle on={!!info?.prefs?.[k]} label={label} onChange={v => setPref(k, v)} disabled={!info} />
          </div>
        ))}
      </div>
      <p className={s.small}>ההגדרות אישיות: לאפק יש הגדרות משלה. כל התראה נשלחת פעם אחת.</p>

      <span className={s.sectionLabel}>מה המצב עכשיו</span>
      <div className={s.rows}>
        {current.map(a => (
          <div key={a.name} className={s.rowItem}>
            <span className={s.dot} style={{ background: a.over ? 'var(--warn)' : '#8A6D3B' }} aria-hidden="true" />
            <div className={s.nameCol}>
              <span className={s.name}>{a.over ? `חריגה ב${a.name}` : `${a.name} ב-${Math.round(a.pct * 100)}%`}</span>
              <span className={s.small}>{money(a.used)} מתוך {money(a.base)}</span>
            </div>
          </div>
        ))}
        {month.data && !current.length && <div className={s.empty}>אין חריגות החודש</div>}
      </div>
    </div>
  )
}

// אותו כלל כמו evalCategory_ בגיליון (חריגה / סף התראה)
function alertsNow(data) {
  if (!data) return []
  const monthIdx = new Date().getMonth() + 1
  return data.rows.flatMap(r => {
    if (!['משתנה', 'קבועה', 'שנתית'].includes(r.nature) || r.budget <= 0) return []
    const annual = r.nature === 'שנתית'
    const base = annual ? r.budget * monthIdx : r.budget
    const used = annual ? r.ytd : r.actual
    const pct = used / base
    if (pct >= 1) return [{ name: r.name, over: true, pct, used, base }]
    if (r.nature !== 'קבועה' && pct >= r.thr) return [{ name: r.name, over: false, pct, used, base }]
    return []
  }).sort((a, b) => Number(b.over) - Number(a.over) || b.pct - a.pct)
}
