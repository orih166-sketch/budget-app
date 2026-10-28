import { useState, useRef, useEffect } from 'react'
import { Undo2, Upload, Search } from 'lucide-react'
import TxEditor from './TxEditor.jsx'
import { useSheet, callSheet, notifyChanged } from './api.js'
import { money, ymd, parseYmd, DAYS, cleanMsg, initial } from './format.js'
import { Skeleton, Status } from './ui.jsx'
import s from './sheet.module.css'

const FILTERS = [
  { id: 'all', label: 'הכול', test: () => true },
  { id: 'cal', label: 'כאל', test: t => t.method === 'כאל' },
  { id: 'max', label: 'מקס', test: t => t.method === 'מקס' },
  { id: 'income', label: 'הכנסות', test: t => t.type === 'הכנסה' },
]

export default function Activity({ focusInput, go }) {
  const now = new Date()
  const from = ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const [q, setQ] = useState('')
  const searching = q.trim().length >= 2
  const recent = useSheet('transactions', { from, to: ymd(now) })
  // בחיפוש קוראים את כל התנועות מתחילת השנה שעברה
  const all = useSheet(searching ? 'transactions' : null, { from: `${now.getFullYear() - 1}-01-01`, to: ymd(now) })
  const tx = searching ? all : recent
  const [editing, setEditing] = useState(null)

  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [canUndo, setCanUndo] = useState(false)
  const [filter, setFilter] = useState('all')
  const inputRef = useRef(null)

  useEffect(() => { if (focusInput) inputRef.current?.focus() }, [focusInput])

  async function save(e) {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true); setMsg(null)
    try {
      const res = await callSheet('quickAdd', { text: text.trim() })
      setMsg({ ok: true, text: cleanMsg(res?.msg) || 'נשמר' })
      setText(''); setCanUndo(true)
      notifyChanged()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally { setBusy(false) }
  }

  async function undo() {
    setBusy(true)
    try {
      const res = await callSheet('undo')
      setMsg({ ok: true, text: cleanMsg(res?.msg) || 'בוטל' })
      setCanUndo(false)
      notifyChanged()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally { setBusy(false) }
  }

  const f = FILTERS.find(x => x.id === filter)
  const needle = q.trim().toLowerCase()
  const match = t => !searching || [t.desc, t.category, t.method, String(t.amount)].some(v => String(v || '').toLowerCase().includes(needle))
  const days = groupByDay((tx.data || []).filter(t => f.test(t) && match(t)).slice(0, searching ? 150 : 400))

  return (
    <div className={s.screen}>
      <div className={s.topbar}>
        <h1 className={s.h1}>תנועות</h1>
        <button type="button" className={s.secondary} onClick={() => go('import')}>
          <span className={s.row} style={{ gap: 6 }}><Upload size={16} aria-hidden="true" />ייבוא דוח</span>
        </button>
      </div>

      <form className={s.quick} onSubmit={save}>
        <label htmlFor="quick" className={s.muted}>הזנה מהירה, כמו בבוט בטלגרם</label>
        <div className={s.row}>
          <input
            id="quick" ref={inputRef} className={s.input} value={text} onChange={e => setText(e.target.value)}
            placeholder="45 פלאפל מזומן" autoComplete="off" enterKeyHint="send"
          />
          <button type="submit" className={s.primary} disabled={busy || !text.trim()}>{busy ? 'שומר…' : 'שמירה'}</button>
        </div>
        {msg && (
          <div className={s.spread}>
            <span className={msg.ok ? s.okMsg : s.errMsg} role="status">{msg.text}</span>
            {msg.ok && canUndo && (
              <button type="button" className={s.secondary} onClick={undo} disabled={busy}>
                <span className={s.row} style={{ gap: 6 }}><Undo2 size={16} aria-hidden="true" />ביטול</span>
              </button>
            )}
          </div>
        )}
      </form>

      <div className={s.inlineForm}>
        <Search size={18} aria-hidden="true" style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <input className={s.input} type="search" aria-label="חיפוש תנועות" placeholder="חיפוש: בית עסק, קטגוריה או סכום"
          value={q} onChange={e => setQ(e.target.value)} style={{ height: 44 }} />
      </div>

      <div className={s.chips} role="group" aria-label="סינון">
        {FILTERS.map(x => (
          <button key={x.id} type="button" aria-pressed={filter === x.id}
            className={`${s.chipBtn} ${filter === x.id ? s.chipOn : ''}`} onClick={() => setFilter(x.id)}>
            {x.label}
          </button>
        ))}
      </div>

      {!tx.data ? <><Skeleton h={200} /><Skeleton h={140} /></> : days.map(d => (
        <section key={d.date} aria-label={d.label}>
          <div className={s.dayHead}>
            <span>{d.label}</span>
            {d.out > 0 && <span>יצא {money(d.out)}</span>}
          </div>
          <div className={s.rows}>
            {d.items.map(t => {
              const income = t.type === 'הכנסה'
              return (
                <button type="button" key={t.row + t.created} className={`${s.rowItem} ${s.rowBtn}`}
                  aria-label={`עריכה: ${t.desc || t.category} ${money(t.amount, { cents: true })}`} onClick={() => setEditing(t)}>
                  <span className={s.avatar} aria-hidden="true">{initial(t.category)}</span>
                  <div className={s.nameCol}>
                    <span className={s.name}>{t.desc || t.category}</span>
                    <span className={s.small}>{[t.category, t.method, t.source === 'Apple Pay' ? 'Apple Pay' : ''].filter(Boolean).join(' · ')}</span>
                  </div>
                  <span className={`${s.amount} ${income ? s.pos : ''}`}>{income ? '+' : ''}{money(t.amount, { cents: true })}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      {tx.data && !days.length && <div className={`${s.card} ${s.empty}`}>{searching ? 'לא נמצאו תנועות' : 'אין תנועות להצגה'}</div>}
      {searching && !tx.data && tx.loading && <p className={s.status}>מחפש בכל התנועות…</p>}
      <Status loading={tx.loading} error={tx.error} hasData={!!tx.data} retry={tx.reload} />
      {editing && <TxEditor tx={editing} close={() => setEditing(null)} />}
    </div>
  )
}

function groupByDay(list) {
  const today = ymd(new Date())
  const yest = ymd(new Date(Date.now() - 864e5))
  const map = new Map()
  list.forEach(t => {
    if (!map.has(t.date)) map.set(t.date, [])
    map.get(t.date).push(t)
  })
  return [...map.entries()].map(([date, items]) => {
    const d = parseYmd(date)
    const dm = `${d.getDate()}/${d.getMonth() + 1}`
    const label = date === today ? `היום, ${dm}` : date === yest ? `אתמול, ${dm}` : `יום ${DAYS[d.getDay()]}, ${dm}`
    const out = items.filter(t => t.type !== 'הכנסה').reduce((a, t) => a + (Number(t.amount) || 0), 0)
    return { date, label, items, out }
  })
}
