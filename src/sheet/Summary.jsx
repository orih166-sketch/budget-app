import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { useSheet } from './api.js'
import { money, monthLabel, shiftMonth, ymd } from './format.js'
import { Bar, Skeleton, Status } from './ui.jsx'
import s from './sheet.module.css'

const SPEND = ['קבועה', 'שנתית', 'משתנה']

export default function Summary({ initialMonth, back, go }) {
  const thisMonth = ymd(new Date()).slice(0, 7)
  const [month, setMonth] = useState(initialMonth || shiftMonth(thisMonth, -1))
  const m = useSheet('month', { month })
  const p = useSheet('month', { month: shiftMonth(month, -1) })
  const d = m.data?.month === month ? m.data : null
  const prev = p.data?.month === shiftMonth(month, -1) ? p.data : null
  const name = monthLabel(month).split(' ')[0]

  return (
    <div className={s.screen}>
      <div className={s.topbar}>
        <div className={s.row}>
          <button type="button" className={s.iconBtn} aria-label="חזרה" onClick={back}><ChevronRight size={18} aria-hidden="true" /></button>
          <h1 className={s.h1}>סיכום חודש</h1>
        </div>
      </div>
      <div className={s.monthBar}>
        <button type="button" className={s.iconBtn} aria-label="חודש קודם" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronRight size={18} aria-hidden="true" /></button>
        <span className={s.monthSelect} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{monthLabel(month)}</span>
        <button type="button" className={s.iconBtn} aria-label="חודש הבא" disabled={month >= thisMonth} onClick={() => setMonth(shiftMonth(month, 1))}><ChevronLeft size={18} aria-hidden="true" /></button>
      </div>
      {!d ? <><Skeleton h={160} /><Skeleton h={240} /></> : <Body d={d} prev={prev} name={name} month={month} go={go} partial={month === thisMonth} />}
      <Status loading={m.loading} error={m.error} hasData={!!d} />
    </div>
  )
}

function Body({ d, prev, name, month, go, partial }) {
  const t = d.totals
  const bal = t.income.actual - t.expenses.actual - t.savings.actual
  const pbal = prev ? prev.totals.income.actual - prev.totals.expenses.actual - prev.totals.savings.actual : null
  const spend = d.rows.filter(r => SPEND.includes(r.nature))
  const withBudget = spend.filter(r => r.budget > 0)
  const kept = withBudget.filter(r => Math.round(r.actual) <= r.budget)
  const over = withBudget.filter(r => Math.round(r.actual) > r.budget).sort((a, b) => (b.actual - b.budget) - (a.actual - a.budget)).slice(0, 5)
  const top = [...spend].sort((a, b) => b.actual - a.actual).slice(0, 5)
  const topMax = top[0]?.actual || 1

  const tips = []
  if (bal < 0) tips.push(`ב${name} יצא יותר ממה שנכנס, בהפרש של ${money(-bal)} (כולל החיסכון). את ההפרש כיסה כסף מהעו"ש או מהחיסכון.`)
  else tips.push(`ב${name} נשארו ${money(bal)} אחרי כל ההוצאות והחיסכון.`)
  if (over[0]) tips.push(`החריגה הכי גדולה: ${over[0].name} (${money(over[0].actual - over[0].budget)} מעל התקציב). כדאי לבדוק אם התקציב שם מציאותי או שצריך לצמצם.`)
  if (withBudget.length) tips.push(`עמדתם בתקציב ב-${kept.length} מתוך ${withBudget.length} קטגוריות.`)

  return (
    <>
      <section className={s.hero} aria-label="שורה תחתונה">
        <span className={s.heroLabel}>{partial ? 'עד עכשיו' : 'בשורה התחתונה'}{bal >= 0 ? ' — עודף' : ' — גירעון'}</span>
        <span className={`${s.heroNum} ${bal < 0 ? s.warnText : s.pos}`}>{money(Math.abs(bal))}</span>
        {pbal !== null && <span className={s.heroSub}>בחודש שלפניו: {pbal >= 0 ? 'עודף' : 'גירעון'} של {money(Math.abs(pbal))}</span>}
      </section>

      <div className={s.kpis}>
        {[['הכנסות', t.income.actual, prev?.totals.income.actual, true], ['הוצאות', t.expenses.actual, prev?.totals.expenses.actual, false], ['חיסכון', t.savings.actual, prev?.totals.savings.actual, true]].map(([label, now, before, upGood]) => {
          const diff = before === undefined ? 0 : now - before
          const bad = upGood ? diff < 0 : diff > 0
          return (
            <div key={label} className={s.kpi}>
              <span className={s.kpiLabel}>{label}</span>
              <span className={s.kpiNum}>{money(now)}</span>
              {before !== undefined && Math.round(diff) !== 0 && <span className={`${s.small} ${bad ? s.warnText : ''}`}>{diff > 0 ? 'יותר' : 'פחות'} {money(Math.abs(diff))}</span>}
            </div>
          )
        })}
      </div>

      <div className={s.card} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className={s.name}>מה למדנו</span>
        {tips.map((x, i) => <span key={i} className={s.muted} style={{ lineHeight: 1.6 }}>{x}</span>)}
      </div>

      {over.length > 0 && (
        <>
          <h2 className={s.h2}>איפה חרגתם</h2>
          <div className={s.rows}>
            {over.map(r => (
              <div key={r.name} className={s.rowItem}>
                <div className={s.nameCol}><span className={s.name}>{r.name}</span><span className={s.small}>{money(r.actual)} מתוך {money(r.budget)}</span></div>
                <span className={`${s.amount} ${s.warnText}`}>+{money(r.actual - r.budget)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className={s.h2}>על מה הלך הכי הרבה כסף</h2>
      <div className={s.list}>
        {top.map(r => (
          <div key={r.name} className={s.catCard}>
            <div className={s.spread}><span className={s.name}>{r.name}</span><span className={s.amount}>{money(r.actual)}</span></div>
            <Bar thin pct={r.actual / topMax} />
          </div>
        ))}
      </div>

      <button type="button" className={s.primary} style={{ height: 52 }} onClick={() => go('budget', shiftMonth(month, 1))}>
        בניית תקציב ל{monthLabel(shiftMonth(month, 1)).split(' ')[0]}
      </button>
    </>
  )
}
