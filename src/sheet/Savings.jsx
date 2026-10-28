import { useState } from 'react'
import { useSheet, callSheet, notifyChanged } from './api.js'
import { money, ddmm } from './format.js'
import { Bar, Skeleton, Status } from './ui.jsx'
import s from './sheet.module.css'

export default function Savings() {
  const sv = useSheet('savings', {})
  const d = sv.data
  const [setup, setSetup] = useState(false)

  return (
    <div className={s.screen}>
      <div className={s.topbar}>
        <h1 className={s.h1}>חיסכון וקופות</h1>
        {d?.balancesFrom && !setup && <button type="button" className={s.link} onClick={() => setSetup(true)}>עדכון יתרות</button>}
      </div>
      {!d ? <><Skeleton h={130} /><Skeleton h={300} /></>
        : (setup || !d.balancesFrom) ? <Setup d={d} done={() => setSetup(false)} canCancel={!!d.balancesFrom} />
        : <Body d={d} />}
      <Status loading={sv.loading} error={sv.error} hasData={!!d} retry={sv.reload} />
    </div>
  )
}

/** הזנה חד-פעמית של היתרה האמיתית בכל קופה היום. */
function Setup({ d, done, canCancel }) {
  const [vals, setVals] = useState(() => Object.fromEntries(d.funds.map(f => [f.name, d.balancesFrom ? String(Math.round(f.balance)) : ''])))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const balances = Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, String(v).replace(/[,₪\s]/g, '') || '0']))
      await callSheet('savingsSetup', { balances })
      notifyChanged()
      done()
    } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }

  return (
    <form className={s.list} onSubmit={save}>
      <div className={s.card} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className={s.name}>כמה יש היום בכל קופה?</span>
        <span className={s.muted} style={{ lineHeight: 1.6 }}>
          מעתיקים מהאתר של בית ההשקעות את היתרה של כל קרן כספית. מהיום כל הפקדה חדשה תתווסף לקופה שלה לבד.
          קופה שאין בה כסף משאירים ריקה.
        </span>
      </div>
      <div className={s.rows}>
        {d.funds.map(f => (
          <div key={f.name} className={s.rowItem}>
            <div className={s.nameCol}>
              <label htmlFor={'f-' + f.name} className={s.name}>{f.name}</label>
              <span className={s.small}>{f.held || f.kind}</span>
            </div>
            <input id={'f-' + f.name} className={s.input} style={{ flex: '0 0 110px', height: 44 }} inputMode="decimal"
              placeholder="₪0" value={vals[f.name]} onChange={e => setVals(v => ({ ...v, [f.name]: e.target.value }))} />
          </div>
        ))}
      </div>
      {err && <p className={s.errMsg} role="alert">{err}</p>}
      <button type="submit" className={s.primary} style={{ height: 52 }} disabled={busy}>{busy ? 'שומר…' : 'שמירת היתרות'}</button>
      {canCancel && <button type="button" className={s.link} onClick={done}>ביטול</button>}
    </form>
  )
}

function Body({ d }) {
  const [open, setOpen] = useState(false)
  const funds = d.funds.filter(f => f.target > 0 || f.balance > 0)
  const total = d.funds.reduce((a, f) => a + (f.balance || 0), 0)
  const monthly = funds.reduce((a, f) => a + (f.monthlyNeed || 0), 0)

  return (
    <>
      <section className={s.hero} aria-label="סך החיסכון">
        <span className={s.heroLabel}>נצבר בכל הקופות</span>
        <span className={s.heroNum}>{money(total)}</span>
        <span className={s.heroSub}>
          הפקדתם החודש {money(d.savingsDeposited)}{monthly ? ` · מתוכנן ${money(monthly)} בחודש` : ''}
        </span>
      </section>

      {d.pendingCount > 0 && (
        <div className={s.banner} role="note">
          <div className={s.nameCol}>
            <span className={s.name} style={{ color: 'var(--warn)' }}>{money(d.pendingTotal)} עוד לא שויכו לקופה</span>
            <span className={s.small}>{d.pendingCount} הפקדות שהמערכת לא ידעה לאיזו קופה הן שייכות</span>
          </div>
          <button type="button" className={s.primary} style={{ height: 44 }} onClick={() => setOpen(o => !o)}>{open ? 'סגירה' : 'לשייך'}</button>
        </div>
      )}
      {open && <Pending />}

      <h2 className={s.h2}>קופות ויעדים</h2>
      <div className={s.list}>
        {funds.map(f => {
          const pct = f.target > 0 ? f.balance / f.target : 0
          return (
            <div key={f.name} className={s.catCard}>
              <div className={s.spread} style={{ alignItems: 'flex-start' }}>
                <div className={s.nameCol}>
                  <span className={s.name} style={{ fontSize: 16, fontWeight: 700 }}>{f.name}</span>
                  <span className={s.small}>{[f.monthlyNeed ? `${money(f.monthlyNeed, { cents: true })} בחודש` : '', f.held.split('—')[0].trim()].filter(Boolean).join(' · ') || f.kind}</span>
                </div>
                {f.target > 0 && <span className={s.pill}>{pct >= 1 ? 'הושג' : Math.round(pct * 100) + '%'}</span>}
              </div>
              {f.target > 0 && <Bar thin pct={pct} />}
              <div className={s.spread}>
                <span className={s.amount}>{money(f.balance)}</span>
                {f.target > 0 && <span className={s.small}>{f.gap > 0 ? `חסרים ${money(f.gap)} · ` : ''}יעד {money(f.target)}</span>}
              </div>
            </div>
          )
        })}
      </div>
      <p className={s.small}>היתרות נכונות מ-{ddmm(d.balancesFrom)} ועוד ההפקדות מאז. הפקדות קבועות לקרנות הכספיות משויכות לבד לפי הקרן של כל קופה.</p>
    </>
  )
}

function Pending() {
  const p = useSheet('savingsPending', {})
  const [choice, setChoice] = useState({})
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  async function allocate(item) {
    const fund = choice[item.key] ?? ''
    setBusy(item.key); setErr('')
    try {
      await callSheet('savingsAllocate', { key: item.key, fund })
      notifyChanged()
    } catch (e) { setErr(e.message) } finally { setBusy('') }
  }

  if (!p.data) return <Skeleton h={160} />
  return (
    <div className={s.rows}>
      {p.data.pending.map(item => (
        <div key={item.key} className={s.rowItem} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div className={s.spread}>
            <span className={s.name}>{item.desc || item.category}</span>
            <span className={s.amount}>{money(item.amount, { cents: true })}</span>
          </div>
          <span className={s.small}>{ddmm(item.date)} · {item.category}</span>
          <div className={s.row}>
            <select className={s.select} style={{ flex: 1 }} aria-label={`קופה עבור ${item.desc}`}
              value={choice[item.key] ?? ''} onChange={e => setChoice(c => ({ ...c, [item.key]: e.target.value }))}>
              <option value="">לא לקופה (חיסכון כללי)</option>
              {p.data.funds.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
            <button type="button" className={s.secondary} disabled={!!busy} onClick={() => allocate(item)}>
              {busy === item.key ? 'שומר…' : 'שיוך'}
            </button>
          </div>
        </div>
      ))}
      {!p.data.pending.length && <div className={s.empty}>כל ההפקדות שויכו</div>}
      {err && <p className={s.errMsg} role="alert" style={{ padding: '0 14px 14px' }}>{err}</p>}
    </div>
  )
}
