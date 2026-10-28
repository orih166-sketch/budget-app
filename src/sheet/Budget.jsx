import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useSheet, callSheet, notifyChanged } from './api.js'
import { money, monthLabel, shiftMonth, ymd } from './format.js'
import { Skeleton, Status } from './ui.jsx'
import s from './sheet.module.css'

const SECTIONS = [
  { id: 'income', title: 'הכנסות צפויות', test: r => r.nature === 'הכנסה', hint: 'כמה כסף ייכנס החודש' },
  { id: 'fixed', title: 'הוצאות קבועות', test: r => r.nature === 'קבועה' || r.nature === 'שנתית', hint: 'משכנתא, ביטוחים, מנויים — כמעט לא משתנות' },
  { id: 'variable', title: 'הוצאות משתנות', test: r => r.nature === 'משתנה', hint: 'כאן נמצא רוב החיסכון האפשרי' },
  { id: 'savings', title: 'חיסכון', test: r => r.nature === 'חיסכון', hint: 'כסף שמפרישים לקופות ולהשקעות' },
]

const num = v => Number(String(v ?? '').replace(/[,₪\s]/g, '')) || 0
const round10 = n => Math.ceil(n / 10) * 10

export default function Budget({ initialMonth, back }) {
  const thisMonth = ymd(new Date()).slice(0, 7)
  const [month, setMonth] = useState(initialMonth || thisMonth)
  const plan = useSheet('budgetPlan', { month })
  const [vals, setVals] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [open, setOpen] = useState('variable')

  useEffect(() => { setVals(null); setMsg(null) }, [month])
  useEffect(() => {
    if (plan.data && plan.data.month === month && !vals)
      setVals(Object.fromEntries(plan.data.rows.map(r => [r.name, String(Math.round(r.budget))])))
  }, [plan.data, month, vals])

  const rows = plan.data?.month === month ? plan.data.rows : null
  const total = test => (rows || []).filter(test).reduce((a, r) => a + num(vals?.[r.name]), 0)
  const inc = total(SECTIONS[0].test), exp = total(SECTIONS[1].test) + total(SECTIONS[2].test), sav = total(SECTIONS[3].test)
  const bal = inc - exp - sav

  const fillAvg = () => setVals(v => ({ ...v, ...Object.fromEntries(rows.filter(SECTIONS[2].test).map(r => [r.name, String(round10(r.avg3))])) }))

  async function save() {
    setBusy(true); setMsg(null)
    try {
      await callSheet('budgetSave', { month, budgets: Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, num(v)])) })
      setMsg({ ok: true, text: `התקציב של ${monthLabel(month)} נשמר` })
      notifyChanged()
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }

  return (
    <div className={s.screen}>
      <div className={s.topbar}>
        <div className={s.row}>
          <button type="button" className={s.iconBtn} aria-label="חזרה" onClick={back}><ChevronRight size={18} aria-hidden="true" /></button>
          <h1 className={s.h1}>בניית תקציב</h1>
        </div>
      </div>

      <div className={s.monthBar}>
        <button type="button" className={s.iconBtn} aria-label="חודש קודם" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronRight size={18} aria-hidden="true" /></button>
        <span className={s.monthSelect} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{monthLabel(month)}</span>
        <button type="button" className={s.iconBtn} aria-label="חודש הבא" disabled={month > thisMonth} onClick={() => setMonth(shiftMonth(month, 1))}><ChevronLeft size={18} aria-hidden="true" /></button>
      </div>

      <div className={s.card} style={{ padding: 14 }}>
        <span className={s.muted} style={{ lineHeight: 1.6 }}>
          תקציב טוב מתחיל מההכנסות: כמה ייכנס, פחות ההוצאות הקבועות והחיסכון — מה שנשאר הוא מה שאפשר להוציא על הוצאות משתנות.
          ליד כל קטגוריה מופיע כמה הוצאתם בממוצע ב-3 החודשים האחרונים.
        </span>
      </div>

      {!rows || !vals ? <><Skeleton h={80} /><Skeleton h={300} /></> : (
        <>
          {SECTIONS.map(sec => {
            const list = rows.filter(sec.test)
            const isOpen = open === sec.id
            return (
              <section key={sec.id} className={s.rows} aria-label={sec.title}>
                <button type="button" className={`${s.rowItem} ${s.rowBtn}`} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? '' : sec.id)}>
                  <div className={s.nameCol}>
                    <span className={s.name} style={{ fontSize: 16, fontWeight: 700 }}>{sec.title}</span>
                    <span className={s.small}>{sec.hint}</span>
                  </div>
                  <span className={s.amount}>{money(total(sec.test))}</span>
                </button>
                {isOpen && sec.id === 'variable' && (
                  <div className={s.rowItem}><button type="button" className={s.secondary} onClick={fillAvg}>למלא לפי הממוצע של 3 חודשים</button></div>
                )}
                {isOpen && list.map(r => (
                  <div key={r.name} className={s.budgetRow}>
                    <div className={s.nameCol}>
                      <label htmlFor={'b-' + r.name} className={s.name} style={{ fontWeight: 500 }}>{r.name}</label>
                      <span className={s.small}>ממוצע {money(r.avg3)} · בחודש שעבר {money(r.last)}</span>
                    </div>
                    <input id={'b-' + r.name} className={s.budgetInput} inputMode="decimal" value={vals[r.name] ?? ''}
                      onChange={e => setVals(v => ({ ...v, [r.name]: e.target.value }))} />
                  </div>
                ))}
              </section>
            )
          })}

          <div className={s.sticky} role="status">
            <div className={s.spread}>
              <span className={s.small}>הכנסות {money(inc)} · הוצאות {money(exp)} · חיסכון {money(sav)}</span>
            </div>
            <div className={s.spread}>
              <span className={`${s.name} ${bal < 0 ? s.warnText : s.pos}`}>
                {bal >= 0 ? `מאוזן: נשארים ${money(bal)}` : `חסרים ${money(-bal)} כדי לאזן`}
              </span>
              <button type="button" className={s.primary} disabled={busy} onClick={save}>{busy ? 'שומר…' : 'שמירה'}</button>
            </div>
            {msg && <span className={msg.ok ? s.okMsg : s.errMsg}>{msg.text}</span>}
          </div>
        </>
      )}
      <Status loading={plan.loading} error={plan.error} hasData={!!rows} />
    </div>
  )
}
