import { useState, useEffect } from 'react'
import { useSheet, callSheet, notifyChanged } from './api.js'
import { money } from './format.js'
import s from './sheet.module.css'

/** חלון תחתון לתיקון או מחיקה של תנועה ביומן. */
export default function TxEditor({ tx, close }) {
  const boot = useSheet('bootstrap', {})
  const [f, setF] = useState({ date: tx.date, amount: String(tx.amount), desc: tx.desc || '', category: tx.category, method: tx.method })
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  const id = { row: tx.row, date: tx.date, amount: tx.amount, created: tx.created }
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }))

  async function run(action, params) {
    setBusy(true); setErr('')
    try { await callSheet(action, params); notifyChanged(); close() } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const save = e => {
    e.preventDefault()
    const amount = Number(String(f.amount).replace(/[,₪\s]/g, ''))
    if (!amount) { setErr('צריך סכום'); return }
    run('updateTx', { ...id, patch: { date: f.date, amount, desc: f.desc, category: f.category, method: f.method } })
  }

  const cats = boot.data?.categories || [{ name: tx.category, group: tx.group }]
  const groups = [...new Set(cats.map(c => c.group))]

  return (
    <>
      <div className={s.backdrop} onClick={close} aria-hidden="true" />
      <form className={s.sheet} role="dialog" aria-modal="true" aria-label="עריכת תנועה" onSubmit={save}>
        <span className={s.grab} aria-hidden="true" />
        <div className={s.spread}>
          <span className={s.h2} style={{ margin: 0 }}>עריכת תנועה</span>
          <span className={s.small}>{tx.source ? `נרשם דרך ${tx.source}` : ''}</span>
        </div>

        <div className={s.kpis2}>
          <div className={s.field}>
            <label htmlFor="e-amount" className={s.fieldLabel}>סכום</label>
            <input id="e-amount" className={s.input} inputMode="decimal" value={f.amount} onChange={set('amount')} />
          </div>
          <div className={s.field}>
            <label htmlFor="e-date" className={s.fieldLabel}>תאריך</label>
            <input id="e-date" className={s.input} type="date" value={f.date} onChange={set('date')} />
          </div>
        </div>
        <div className={s.field}>
          <label htmlFor="e-desc" className={s.fieldLabel}>תיאור</label>
          <input id="e-desc" className={s.input} value={f.desc} onChange={set('desc')} />
        </div>
        <div className={s.kpis2}>
          <div className={s.field}>
            <label htmlFor="e-cat" className={s.fieldLabel}>קטגוריה</label>
            <select id="e-cat" className={s.select} value={f.category} onChange={set('category')}>
              {groups.map(g => (
                <optgroup key={g} label={g}>
                  {cats.filter(c => c.group === g).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className={s.field}>
            <label htmlFor="e-method" className={s.fieldLabel}>אמצעי תשלום</label>
            <select id="e-method" className={s.select} value={f.method} onChange={set('method')}>
              {(boot.data?.methods || [tx.method]).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <span className={s.small}>שינוי קטגוריה נשמר גם בזיכרון בתי העסק, כך שבפעם הבאה זה ימוין נכון לבד.</span>

        {err && <p className={s.errMsg} role="alert">{err}</p>}
        <button type="submit" className={s.primary} style={{ height: 50 }} disabled={busy}>{busy ? 'שומר…' : 'שמירה'}</button>
        {!confirmDel
          ? <button type="button" className={s.danger} disabled={busy} onClick={() => setConfirmDel(true)}>מחיקת התנועה</button>
          : <button type="button" className={s.danger} disabled={busy} onClick={() => run('deleteTx', id)}>
              {busy ? 'מוחק…' : `בטוח? למחוק ${money(tx.amount, { cents: true })} מהיומן`}
            </button>}
        <button type="button" className={s.link} onClick={close}>ביטול</button>
      </form>
    </>
  )
}
