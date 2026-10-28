import { useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useSheet, callSheet, notifyChanged } from './api.js'
import { money, ymd, ddmm } from './format.js'
import s from './sheet.module.css'

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/16hKjDyqzksANpfs6VsDwkx_teZCmtihqd0wjFEBItFg/edit'

export default function SettingsScreen({ back, go, user, logout }) {
  const boot = useSheet('bootstrap', {})
  const set = boot.data?.settings
  const [balance, setBalance] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function saveBalance(e) {
    e.preventDefault()
    const n = Number(String(balance).replace(/[,₪\s]/g, ''))
    if (!balance.trim() || Number.isNaN(n)) { setMsg({ ok: false, text: 'צריך לכתוב סכום' }); return }
    setBusy(true); setMsg(null)
    try {
      await callSheet('setBalance', { balance: n, date: ymd(new Date()) })
      setMsg({ ok: true, text: 'היתרה עודכנה והתזרים חושב מחדש' })
      setBalance('')
      notifyChanged()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally { setBusy(false) }
  }

  return (
    <div className={s.screen}>
      <div className={s.topbar}>
        <div className={s.row}>
          <button type="button" className={s.iconBtn} aria-label="חזרה" onClick={back}><ChevronRight size={18} aria-hidden="true" /></button>
          <h1 className={s.h1}>הגדרות</h1>
        </div>
      </div>

      <span className={s.sectionLabel}>חשבון הבנק</span>
      <form className={s.card} onSubmit={saveBalance}>
        <div className={s.formGrid}>
          <div className={s.field} style={{ gridColumn: 'span 2' }}>
            <label htmlFor="bal" className={s.fieldLabel}>
              יתרה בעו"ש היום{set ? ` (עכשיו רשום ${money(set.balance)}${set.balanceDate ? ` נכון ל-${ddmm(set.balanceDate)}` : ''})` : ''}
            </label>
            <div className={s.row}>
              <input id="bal" className={s.input} inputMode="decimal" value={balance} onChange={e => setBalance(e.target.value)} placeholder="למשל 12,480" />
              <button type="submit" className={s.primary} disabled={busy}>{busy ? 'שומר…' : 'עדכון'}</button>
            </div>
          </div>
        </div>
        {msg && <p className={msg.ok ? s.okMsg : s.errMsg} style={{ padding: '0 14px 14px' }} role="status">{msg.text}</p>}
      </form>

      <span className={s.sectionLabel}>כרטיסי אשראי</span>
      <div className={s.rows}>
        <div className={s.rowItem}>
          <div className={s.nameCol}><span className={s.name}>כאל</span><span className={s.small}>רכישות מהיום שאחרי החיוב הקודם ועד יום החיוב</span></div>
          <span className={s.pill}>יום {set?.cardDays?.['כאל'] ?? '—'}</span>
        </div>
        <div className={s.rowItem}>
          <div className={s.nameCol}><span className={s.name}>מקס</span><span className={s.small}>רכישות של החודש הקודם</span></div>
          <span className={s.pill}>יום {set?.cardDays?.['מקס'] ?? '—'}</span>
        </div>
      </div>

      <span className={s.sectionLabel}>חיבורים</span>
      <div className={s.rows}>
        {[['alerts', 'התראות', 'פוש לטלפון: חריגות, מינוס, חיובים'], ['applepay', 'רישום אוטומטי מ-Apple Pay', 'הגדרה חד-פעמית בכל טלפון'], ['import', 'ייבוא דוח', 'קובץ מכאל, מקס או הבנק']].map(([id, name, sub]) => (
          <button key={id} type="button" className={s.rowItem} onClick={() => go(id)}
            style={{ background: 'none', border: 0, font: 'inherit', color: 'inherit', textAlign: 'right', cursor: 'pointer', width: '100%' }}>
            <div className={s.nameCol}><span className={s.name}>{name}</span><span className={s.small}>{sub}</span></div>
            <ChevronLeft size={16} color="#6E6A5C" aria-hidden="true" />
          </button>
        ))}
        <div className={s.rowItem}>
          <div className={s.nameCol}><span className={s.name}>בוט בטלגרם</span><span className={s.small}>@ori_budget_bot · כותב לאותו יומן</span></div>
          <span className={s.pill}>מחובר</span>
        </div>
      </div>

      <span className={s.sectionLabel}>חשבון</span>
      <div className={s.rows}>
        <div className={s.rowItem}>
          <div className={s.nameCol}><span className={s.name}>מחובר בתור</span><span className={s.small} dir="ltr" style={{ textAlign: 'right' }}>{user?.email || '—'}</span></div>
        </div>
        <div className={s.rowItem}>
          <a className={s.link} href={SHEET_URL} target="_blank" rel="noreferrer">פתיחת הגיליון</a>
        </div>
        {logout && (
          <div className={s.rowItem}>
            <button type="button" className={s.link} style={{ color: 'var(--warn)' }} onClick={logout}>התנתקות</button>
          </div>
        )}
      </div>
    </div>
  )
}
