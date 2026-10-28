import { useSheet } from './api.js'
import { money, ddmm, parseYmd, MONTHS } from './format.js'
import { Skeleton, Status } from './ui.jsx'
import { SafeCard, BalanceNudge } from './Safe.jsx'
import s from './sheet.module.css'

export default function Cashflow() {
  const cf = useSheet('cashflow', {})
  const d = cf.data

  return (
    <div className={s.screen}>
      <div className={s.topbar}>
        <h1 className={s.h1}>תזרים</h1>
        {d && <StatusPill d={d} />}
      </div>
      {!d ? <><Skeleton h={150} /><Skeleton h={230} /><Skeleton h={280} /></> : <Body d={d} />}
      <Status loading={cf.loading} error={cf.error} hasData={!!d} retry={cf.reload} />
    </div>
  )
}

function StatusPill({ d }) {
  if (d.minValue < 0) return <span className={`${s.pill} ${s.pillWarn}`}>צפוי מינוס ב-{ddmm(d.minDate)}</span>
  if (d.cushion && d.minValue < d.cushion) return <span className={`${s.pill} ${s.pillWarn}`}>מתחת לכרית ב-{ddmm(d.minDate)}</span>
  return <span className={s.pill}>מעל הכרית ב-60 יום</span>
}

function Body({ d }) {
  const incomeNames = new Set(d.scheduled.filter(x => x.type === 'הכנסה').map(x => x.name))
  const events = d.days
    .filter(x => x.label)
    .flatMap(x => x.label.split(' ; ').map(part => {
      const m = part.match(/^(.*?)\s+(-?₪[\d,.]+)$/)
      const name = m ? m[1] : part
      return { date: x.date, name, amount: m ? m[2] : '', income: incomeNames.has(name) }
    }))
    .slice(0, 10)

  return (
    <>
      <SafeCard cf={d} />
      <BalanceNudge cf={d} />

      <section className={s.hero} aria-label="יתרה">
        <span className={s.heroLabel}>יתרה משוערת בעו"ש היום</span>
        <span className={s.heroNum}>{money(d.start)}</span>
        <Chart d={d} />
        <div className={s.spread}>
          <span className={s.small}>היום</span>
          <span className={s.small}>קו מקווקו: הכרית {money(d.cushion)}</span>
          <span className={s.small}>{d.days.length ? ddmm(d.days[d.days.length - 1].date) : ''}</span>
        </div>
      </section>

      <div className={s.kpis2}>
        <div className={s.kpi}>
          <span className={s.kpiLabel}>צפוי בסוף החודש</span>
          <span className={s.kpiNum}>{money(d.eomBalance)}</span>
        </div>
        <div className={s.kpi}>
          <span className={s.kpiLabel}>חיוב הכרטיסים הבא</span>
          <span className={s.kpiNum}>{d.cardNext ? `${money(d.cardNext.amount)} · ${ddmm(d.cardNext.date)}` : '—'}</span>
        </div>
      </div>

      <h2 className={s.h2}>חיובים והכנסות קרובים</h2>
      <div className={s.rows}>
        {events.map((e, i) => {
          const dt = parseYmd(e.date)
          return (
            <div key={i} className={s.rowItem}>
              <div className={s.dateBox}>
                <span className={s.dateDay}>{dt.getDate()}</span>
                <span className={s.small}>{MONTHS[dt.getMonth()].slice(0, 3)}׳</span>
              </div>
              <div className={s.nameCol}><span className={s.name}>{e.name}</span></div>
              <span className={`${s.amount} ${e.income ? s.pos : ''}`}>{e.income ? '+' : ''}{e.amount}</span>
            </div>
          )
        })}
        {!events.length && <div className={s.empty}>אין חיובים קבועים ב-60 הימים הקרובים</div>}
      </div>
      <p className={s.small}>
        יתרת הפתיחה נכונה ל-{ddmm(d.balanceDate)}. התחזית מניחה שתמשיכו להוציא בקצב של 30 הימים האחרונים
        (בכרטיסים, ועוד {money(d.estDaily)} ליום בביט והעברות).
      </p>
    </>
  )
}

function Chart({ d }) {
  const pts = [d.start, ...d.days.map(x => x.balance)]
  if (pts.length < 2) return null
  const W = 340, H = 100, top = 8
  const max = Math.max(...pts, d.cushion || 0), min = Math.min(0, ...pts)
  const span = max - min || 1
  // ימין לשמאל: היום בצד ימין
  const x = i => W - (i / (pts.length - 1)) * W
  const y = v => top + (1 - (v - min) / span) * (H - top - 4)
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(pts.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`
  const mi = pts.indexOf(Math.min(...pts))
  return (
    <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
      aria-label={`תחזית יתרה ל-60 יום. הנקודה הנמוכה ${money(d.minValue)} ב-${ddmm(d.minDate)}, הכרית ${money(d.cushion)}`}>
      {d.cushion > 0 && <line x1="0" x2={W} y1={y(d.cushion)} y2={y(d.cushion)} style={{ stroke: 'var(--muted)' }} strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      {min < 0 && <line x1="0" x2={W} y1={y(0)} y2={y(0)} style={{ stroke: 'var(--warn)' }} strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      <path d={area} style={{ fill: 'var(--accentFill)' }} />
      <path d={line} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(mi)} cy={y(pts[mi])} r="4" style={{ fill: 'var(--card)', stroke: 'var(--warn)' }} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
