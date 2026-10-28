import { useState } from 'react'
import { ChevronRight, Upload } from 'lucide-react'
import { callSheet, notifyChanged } from './api.js'
import { money, ddmm, cleanMsg } from './format.js'
import { Toggle } from './ui.jsx'
import s from './sheet.module.css'

const SOURCES = [
  ['זיהוי אוטומטי', 'זיהוי אוטומטי'],
  ['כאל', 'כאל'],
  ['מקס', 'מקס'],
  ['עו"ש (דיסקונט / מזרחי)', 'עו"ש בבנק'],
]

/** קובץ אקסל / CSV → טקסט עם עמודות מופרדות בטאב, כמו הדבקה בלשונית "הדבקה". */
async function fileToText(file) {
  if (/\.(csv|txt)$/i.test(file.name)) return file.text()
  const XLSX = await import('xlsx')
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  return wb.SheetNames.map(n => XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: '\t', blankrows: false })).join('\n\n')
}

export default function Import({ back }) {
  const [source, setSource] = useState(SOURCES[0][0])
  const [pasteMode, setPasteMode] = useState(false)
  const [pasted, setPasted] = useState('')
  const [res, setRes] = useState(null)
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const [showAll, setShowAll] = useState(false)

  async function analyze(text, name) {
    setBusy('בודק את הדוח מול היומן…'); setMsg(null)
    try {
      const out = await callSheet('pasteAnalyze', { text, source })
      setRes({ ...out, name })
      setRows(out.rows.map((r, i) => ({ ...r, i })))
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy('') }
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try { await analyze(await fileToText(file), file.name) } catch { setMsg({ ok: false, text: 'לא הצלחתי לקרוא את הקובץ' }) }
  }

  async function save() {
    setBusy('שומר ביומן…'); setMsg(null)
    try {
      const out = await callSheet('bankImport', { rows: rows.map(({ i, ...r }) => r) })
      if (out && out.ok === false) throw new Error(cleanMsg(out.msg))
      setMsg({ ok: true, text: cleanMsg(out?.msg) || 'נשמר ביומן' })
      setRes(null); setRows([])
      notifyChanged()
    } catch (e) { setMsg({ ok: false, text: e.message }) } finally { setBusy('') }
  }

  const patch = (i, p) => setRows(rs => rs.map(r => (r.i === i ? { ...r, ...p } : r)))

  const unknown = rows.filter(r => r.checked && r.how === 'לא זוהה')
  const known = rows.filter(r => r.checked && r.how !== 'לא זוהה')
  const skipped = rows.filter(r => !r.checked)
  const chosen = rows.filter(r => r.checked)
  const total = chosen.reduce((a, r) => a + Math.abs(Number(r.amount) || 0), 0)

  const catSelect = r => (
    <select className={s.select} aria-label={`קטגוריה ל${r.desc}`} value={r.cat} onChange={e => patch(r.i, { cat: e.target.value, how: 'נבחר' })}>
      {(res?.cats || [r.cat]).map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  )

  return (
    <div className={s.screen}>
      <div className={s.topbar}>
        <div className={s.row}>
          <button type="button" className={s.iconBtn} aria-label="חזרה" onClick={back}><ChevronRight size={18} aria-hidden="true" /></button>
          <h1 className={s.h1}>ייבוא דוח</h1>
        </div>
      </div>

      {!res && (
        <>
          <div className={s.field}>
            <label htmlFor="src" className={s.fieldLabel}>מאיפה הדוח</label>
            <select id="src" className={s.select} value={source} onChange={e => setSource(e.target.value)}>
              {SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {!pasteMode ? (
            <label className={s.drop}>
              <span className={s.dropIcon} aria-hidden="true"><Upload size={26} /></span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{busy || 'בחירת קובץ'}</span>
              <span className={s.muted}>קובץ אקסל מהאתר של כאל, מקס או הבנק</span>
              <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={onFile} disabled={!!busy}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
            </label>
          ) : (
            <div className={s.quick}>
              <label htmlFor="pasted" className={s.muted}>מדביקים כאן את טבלת העסקאות, כולל שורת הכותרות</label>
              <textarea id="pasted" className={s.textarea} value={pasted} onChange={e => setPasted(e.target.value)} />
              <button type="button" className={s.primary} disabled={!!busy || !pasted.trim()} onClick={() => analyze(pasted, 'טקסט מודבק')}>
                {busy || 'בדיקה'}
              </button>
            </div>
          )}
          <button type="button" className={s.link} onClick={() => setPasteMode(p => !p)}>
            {pasteMode ? 'העלאת קובץ במקום' : 'אין קובץ? אפשר להדביק טקסט'}
          </button>

          <div className={s.card} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className={s.name}>מה קורה אחרי ההעלאה</span>
            <span className={s.muted} style={{ lineHeight: 1.6 }}>
              המערכת ממיינת כל תנועה לפי בית העסק, ומדלגת על תנועות שכבר נרשמו (מהבוט, מ-Apple Pay או מייבוא קודם).
              רק מה שלא זוהה מחכה לבחירה שלך. שום דבר לא נשמר עד שלוחצים "שמירה ביומן".
            </span>
          </div>
        </>
      )}

      {res && (
        <>
          <section className={s.hero} aria-label="סיכום הדוח">
            <div className={s.nameCol}>
              <span className={s.name} style={{ fontSize: 16, fontWeight: 700 }}>{res.kind} · {rows.length} תנועות בקובץ</span>
              <span className={s.small}>{res.name}</span>
            </div>
            <div className={s.stats}>
              <div className={s.stat}><span className={s.statNum} style={{ color: 'var(--accentDark)' }}>{known.length}</span><span className={s.small}>מוינו לבד</span></div>
              <div className={s.stat} style={{ background: 'var(--warnBg)' }}><span className={s.statNum} style={{ color: 'var(--warn)' }}>{unknown.length}</span><span className={s.small}>לבחירתך</span></div>
              <div className={s.stat} style={{ background: 'var(--soft)' }}><span className={s.statNum}>{skipped.length}</span><span className={s.small}>כבר נרשמו או דולגו</span></div>
            </div>
          </section>

          {unknown.length > 0 && (
            <>
              <h2 className={s.h2}>בתי עסק שלא זוהו</h2>
              <div className={s.rows}>
                {unknown.map(r => (
                  <div key={r.i} className={s.rowItem} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                    <div className={s.spread}><span className={s.name}>{r.desc}</span><span className={s.amount}>{money(r.amount, { cents: true })}</span></div>
                    <span className={s.small}>{ddmm(r.date)} · {r.method}</span>
                    {catSelect(r)}
                  </div>
                ))}
              </div>
              <p className={s.small}>בפעם הבאה המערכת תזכור את בתי העסק האלה לבד.</p>
            </>
          )}

          <div className={s.spread}>
            <h2 className={s.h2}>מוינו לבד ({known.length})</h2>
            {known.length > 0 && <button type="button" className={s.link} onClick={() => setShowAll(v => !v)}>{showAll ? 'הסתרה' : 'הצגה ושינוי'}</button>}
          </div>
          {showAll && (
            <div className={s.rows}>
              {known.map(r => (
                <div key={r.i} className={s.rowItem} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div className={s.spread}><span className={s.name}>{r.desc}</span><span className={s.amount}>{money(r.amount, { cents: true })}</span></div>
                  <span className={s.small}>{ddmm(r.date)} · {r.method}</span>
                  {catSelect(r)}
                </div>
              ))}
            </div>
          )}

          {skipped.length > 0 && (
            <>
              <h2 className={s.h2}>לא ייובאו ({skipped.length})</h2>
              <div className={s.rows}>
                {skipped.map(r => (
                  <div key={r.i} className={s.rowItem}>
                    <div className={s.nameCol}>
                      <span className={s.name}>{r.desc} · {money(r.amount, { cents: true })}</span>
                      <span className={s.small}>{ddmm(r.date)} · {r.status}</span>
                    </div>
                    <Toggle on={false} label={`לייבא בכל זאת: ${r.desc}`} onChange={() => patch(r.i, { checked: true })} />
                  </div>
                ))}
              </div>
            </>
          )}

          <button type="button" className={s.primary} style={{ height: 52 }} disabled={!!busy || !chosen.length} onClick={save}>
            {busy || `שמירה ביומן · ${chosen.length} תנועות · ${money(total)}`}
          </button>
          <button type="button" className={s.link} onClick={() => { setRes(null); setRows([]) }}>ביטול, בלי לשמור</button>
        </>
      )}

      {msg && <p className={msg.ok ? s.okMsg : s.errMsg} role="status">{msg.text}</p>}
    </div>
  )
}
