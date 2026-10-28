import s from './sheet.module.css'

export function Bar({ pct, tone = 'ok', thin = false }) {
  const w = Math.max(0, Math.min(100, Math.round((pct || 0) * 100)))
  const cls = [s.fill, tone === 'warn' && s.fillWarn, tone === 'near' && s.fillNear].filter(Boolean).join(' ')
  return (
    <div className={thin ? s.trackThin : s.track}>
      <div className={cls} style={{ width: w + '%' }} />
    </div>
  )
}

export function Toggle({ on, label, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled}
      className={`${s.switch} ${on ? s.switchOn : ''}`} onClick={() => onChange(!on)}>
      <span className={s.knob} />
    </button>
  )
}

export function Skeleton({ h = 80 }) {
  return <div className={s.skeleton} style={{ height: h }} aria-hidden="true" />
}

/** שורת מצב: "מתעדכן…" בזמן טעינה מעל נתונים ישנים, או שגיאה. */
export function Status({ loading, error, hasData }) {
  if (error) return <p className={s.errMsg} role="alert">{hasData ? 'לא הצלחתי לרענן: ' : ''}{error}</p>
  return <p className={s.status} aria-live="polite">{loading && hasData ? 'מתעדכן מהגיליון…' : ''}</p>
}
