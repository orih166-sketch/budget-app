import { useState } from 'react'
import { ChevronRight, ChevronLeft, Settings, Bell } from 'lucide-react'
import { useSheet } from './api.js'
import { money, monthLabel, shiftMonth, ddmm, initial } from './format.js'
import { Bar, Skeleton, Status } from './ui.jsx'
import { SafeCard, BalanceNudge } from './Safe.jsx'
import s from './sheet.module.css'

// החודשים ברשימה: מינואר בשנה שעברה ועד החודש הנוכחי (החדש למעלה)
const monthOptions = thisMonth => {
  const out = []
  for (let ym = thisMonth; ym >= `${Number(thisMonth.slice(0, 4)) - 1}-01`; ym = shiftMonth(ym, -1)) out.push(ym)
  return out
}

export default function Home({ month, setMonth, thisMonth, go, userName }) {
  const [compare, setCompare] = useState(false)
  const m = useSheet('month', { month })
  const prev = useSheet(compare ? 'month' : null, { month: shiftMonth(month, -1) })
  const cf = useSheet('cashflow', {})
  const data = m.data
  const prevData = compare && prev.data?.month === shiftMonth(month, -1) ? prev.data : null

  const isCurrent = month === thisMonth
  const options = monthOptions(thisMonth)
  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'לילה טוב' : hour < 12 ? 'בוקר טוב' : hour < 18 ? 'צהריים טובים' : 'ערב טוב'

  return (
    <div className={s.screen}>
      <div className={s.topbar}>
        <div className={s.titleBlock}>
          <span className={s.hello}>{greeting}{userName ? `, ${userName}` : ''}</span>
          <h1 className={s.h1}>{isCurrent ? 'החודש' : 'חודש קודם'}</h1>
        </div>
        <div className={s.tools}>
          <button type="button" className={s.iconBtn} aria-label="התראות" onClick={() => go('alerts')}>
            <Bell size={20} aria-hidden="true" />
          </button>
          <button type="button" className={s.iconBtn} aria-label="הגדרות" onClick={() => go('settings')}>
            <Settings size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={s.monthBar}>
        <button type="button" className={s.iconBtn} aria-label="חודש קודם" disabled={month <= options[options.length - 1]} onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <select className={s.monthSelect} aria-label="בחירת חודש" value={month} onChange={e => setMonth(e.target.value)}>
          {options.map(ym => <option key={ym} value={ym}>{monthLabel(ym)}</option>)}
        </select>
        <button type="button" className={s.iconBtn} aria-label="חודש הבא" disabled={isCurrent} onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={s.spread}>
        <span className={s.small}>{isCurrent ? 'בתחילת כל חודש עוברים לבד לחודש החדש' : <button type="button" className={s.link} style={{ padding: 0, fontSize: 12 }} onClick={() => setMonth(thisMonth)}>חזרה לחודש הנוכחי</button>}</span>
        <button type="button" aria-pressed={compare} className={`${s.chipBtn} ${compare ? s.chipOn : ''}`} onClick={() => setCompare(c => !c)}>
          השוואה ל{monthLabel(shiftMonth(month, -1)).split(' ')[0]}
        </button>
      </div>

      {isCurrent && new Date().getDate() <= 7 && (
        <button type="button" className={`${s.banner} ${s.rowBtn}`} onClick={() => go('summary')}>
          <div className={s.nameCol}>
            <span className={s.name}>הסיכום של {monthLabel(shiftMonth(month, -1)).split(' ')[0]} מוכן</span>
            <span className={s.small}>כמה נכנס, כמה יצא, איפה חרגתם — ובניית תקציב לחודש החדש</span>
          </div>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
      )}
      {isCurrent && <SafeCard cf={cf.data} />}
      {isCurrent && <BalanceNudge cf={cf.data} />}

      <div className={s.chips}>
        <button type="button" className={s.chipBtn} onClick={() => go('budget', month)}>בניית תקציב</button>
        <button type="button" className={s.chipBtn} onClick={() => go('summary', isCurrent ? shiftMonth(month, -1) : month)}>סיכום חודש</button>
        <button type="button" className={s.chipBtn} onClick={() => go('cashflow')}>תזרים</button>
      </div>

      {!data ? <><Skeleton h={170} /><Skeleton h={84} /><Skeleton h={300} /></> : <MonthBody data={data} prev={prevData} isCurrent={isCurrent} go={go} />}
      {compare && !prevData && data && <p className={s.status}>טוען את החודש הקודם להשוואה…</p>}
      {isCurrent && cf.data?.cardNext && data && (
        <p className={s.small}>חיוב {cf.data.cardNext.card} הבא: {money(cf.data.cardNext.amount)} ב-{ddmm(cf.data.cardNext.date)}</p>
      )}
      <Status loading={m.loading} error={m.error} hasData={!!data} />
    </div>
  )
}

/** "₪X בחודש הקודם · יותר/פחות ₪Y" */
function Was({ now, before, goodWhenLower = true }) {
  if (before === undefined || before === null) return null
  const d = now - before
  const better = goodWhenLower ? d <= 0 : d >= 0
  return (
    <span className={`${s.small} ${Math.round(d) && !better ? s.warnText : ''}`}>
      קודם {money(before)}{Math.round(d) ? ` · ${d > 0 ? 'יותר' : 'פחות'} ${money(Math.abs(d))}` : ''}
    </span>
  )
}

function MonthBody({ data, prev, isCurrent, go }) {
  const t = data.totals
  const pt = prev?.totals
  const prevRow = name => prev?.rows.find(r => r.name === name)
  const budget = t.variable.budget
  const spent = t.variable.actual
  const left = budget - spent

  // כמו "מאזן" במבט החודשי בגיליון: הכנסות פחות הוצאות פחות חיסכון
  const balance = t.income.actual - t.expenses.actual - t.savings.actual
  const planned = t.income.budget - t.expenses.budget - t.savings.budget

  let perDay = null
  if (isCurrent) {
    const now = new Date()
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1
    perDay = { daysLeft, amount: Math.max(0, left) / daysLeft }
  }

  const cats = data.rows
    .filter(r => r.nature === 'משתנה' && (r.budget > 0 || r.actual > 0))
    .map(r => {
      const over = Math.round(r.actual) > r.budget
      const pct = r.budget > 0 ? r.actual / r.budget : 1
      return { ...r, over, pct, near: !over && pct >= (r.thr || 0.85) }
    })
    .sort((a, b) => b.pct - a.pct)

  return (
    <>
      <section className={s.hero} aria-label="מאזן החודש">
        <span className={s.heroLabel}>{balance >= 0 ? (isCurrent ? 'עודף עד עכשיו' : 'עודף בחודש') : (isCurrent ? 'גירעון עד עכשיו' : 'גירעון בחודש')}</span>
        <span className={`${s.heroNum} ${balance < 0 ? s.warnText : ''}`}>{money(Math.abs(balance))}</span>
        <span className={s.heroSub}>הכנסות פחות הוצאות וחיסכון</span>
        {pt && (() => {
          const pb = pt.income.actual - pt.expenses.actual - pt.savings.actual
          return <span className={s.heroSub}>בחודש הקודם: {pb >= 0 ? 'עודף' : 'גירעון'} של {money(Math.abs(pb))}</span>
        })()}
      </section>

      <section className={s.rows} aria-label="תכנון מול בפועל">
        <div className={s.rowItem} style={{ paddingBlock: 10 }}>
          <span className={s.nameCol}><span className={s.small} style={{ fontWeight: 700 }}>תכנון מול בפועל</span></span>
          <span className={s.small} style={{ width: 82, textAlign: 'left' }}>תכנון</span>
          <span className={s.small} style={{ width: 82, textAlign: 'left' }}>בפועל</span>
        </div>
        {[
          ['הכנסות', t.income.budget, t.income.actual, pt?.income.actual, false],
          ['הוצאות', t.expenses.budget, t.expenses.actual, pt?.expenses.actual, true],
          ['חיסכון', t.savings.budget, t.savings.actual, pt?.savings.actual, false],
        ].map(([label, plan, act, before, lowerGood]) => (
          <div key={label} className={s.rowItem}>
            <div className={s.nameCol}>
              <span className={s.name}>{label}</span>
              {pt && <Was now={act} before={before} goodWhenLower={lowerGood} />}
            </div>
            <span className={s.muted} style={{ width: 82, textAlign: 'left' }}>{money(plan)}</span>
            <span className={s.amount} style={{ width: 82, textAlign: 'left' }}>{money(act)}</span>
          </div>
        ))}
        <div className={s.rowItem} style={{ background: 'var(--soft)', borderRadius: '0 0 18px 18px' }}>
          <span className={s.nameCol}><span className={s.name} style={{ fontWeight: 700 }}>מאזן</span></span>
          <span className={`${s.amount} ${planned < 0 ? s.warnText : s.pos}`} style={{ width: 82, textAlign: 'left' }}>{money(planned)}</span>
          <span className={`${s.amount} ${balance < 0 ? s.warnText : s.pos}`} style={{ width: 82, textAlign: 'left' }}>{money(balance)}</span>
        </div>
      </section>

      <section className={s.catCard} aria-label="הוצאות משתנות">
        <div className={s.spread}>
          <span className={s.name}>{left >= 0 ? 'נשאר בהוצאות המשתנות' : 'חריגה בהוצאות המשתנות'}</span>
          <span className={`${s.amount} ${left < 0 ? s.warnText : ''}`}>{money(Math.abs(left))}</span>
        </div>
        <Bar pct={budget ? spent / budget : 0} tone={left < 0 ? 'warn' : 'ok'} />
        <div className={s.spread}>
          <span className={s.small}>הוצאתם {money(spent)} מתוך {money(budget)}</span>
          {perDay && left > 0 && <span className={s.small}>{money(perDay.amount)} ליום</span>}
        </div>
      </section>

      <div className={s.spread}>
        <h2 className={s.h2}>הוצאות משתנות</h2>
        <button type="button" className={s.link} onClick={() => go('activity')}>לכל התנועות</button>
      </div>

      <div className={s.list}>
        {cats.map(c => (
          <div key={c.name} className={s.catCard}>
            <div className={s.spread}>
              <div className={s.row} style={{ gap: 10, minWidth: 0, flex: 1 }}>
                <span className={s.avatar} aria-hidden="true">{initial(c.name)}</span>
                <div className={s.nameCol}>
                  <span className={s.name}>{c.name}</span>
                  <span className={`${s.small} ${c.over ? s.warnText : ''}`}>
                    {c.over ? `חריגה של ${money(c.actual - c.budget)}` : `נשארו ${money(Math.max(0, c.budget - c.actual))}`}
                  </span>
                </div>
              </div>
              <div className={s.amountCol}>
                <span className={s.amount}>{money(c.actual)}</span>
                <span className={s.small}>מתוך {money(c.budget)}</span>
              </div>
            </div>
            <Bar thin pct={c.pct} tone={c.over ? 'warn' : c.near ? 'near' : 'ok'} />
            {prev && <Was now={c.actual} before={prevRow(c.name)?.actual ?? 0} />}
          </div>
        ))}
        {!cats.length && <div className={`${s.card} ${s.empty}`}>אין הוצאות משתנות בחודש הזה</div>}
      </div>
    </>
  )
}
