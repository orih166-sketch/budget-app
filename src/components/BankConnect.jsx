import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useHousehold } from '../context/HouseholdContext.jsx'
import styles from './BankConnect.module.css'

const BANKS = [
  { id: 'discount',   label: 'דיסקונט',      icon: '🏦', fields: ['id', 'password'] },
  { id: 'leumi',      label: 'לאומי',         icon: '🏛', fields: ['username', 'password'] },
  { id: 'hapoalim',   label: 'הפועלים',       icon: '🔴', fields: ['username', 'password'] },
  { id: 'mizrahi',    label: 'מזרחי-טפחות',  icon: '🟠', fields: ['id', 'password'] },
  { id: 'mercantile', label: 'מרכנתיל',       icon: '🏢', fields: ['id', 'password'] },
]

const FIELD_LABELS = {
  id:       'תעודת זהות',
  username: 'שם משתמש',
  password: 'סיסמה',
}

const RANGE_OPTIONS = [
  { label: '3 חודשים', months: 3 },
  { label: '6 חודשים', months: 6 },
  { label: 'שנה',      months: 12 },
]

const MODES = [
  { id: 'sync',   label: 'סנכרון אוטומטי', icon: '🔄' },
  { id: 'import', label: 'ייבוא מאקסל',    icon: '📂' },
]

export default function BankConnect({ onClose, onImported }) {
  const { household } = useHousehold()
  const fileRef = useRef(null)

  const [mode, setMode]         = useState('import') // start on import — more reliable
  const [bank, setBank]         = useState(BANKS[0])
  const [creds, setCreds]       = useState({})
  const [showPass, setShowPass] = useState(false)
  const [months, setMonths]     = useState(3)
  const [step, setStep]         = useState('form')   // form | loading | done | error
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [phase, setPhase]       = useState('')

  // ── Excel/PDF import state ──
  const [fileName, setFileName]   = useState('')
  const [preview, setPreview]     = useState(null)   // { rows, bankName }
  const [importing, setImporting] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  // ────────── SYNC ──────────
  async function submitSync(e) {
    e.preventDefault()
    setStep('loading'); setError(''); setPhase('מתחבר לבנק...')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('לא מחובר')

      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)
      setPhase('שולף עסקאות (עד דקה-שתיים)...')

      const res = await fetch('/api/scrape-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank: bank.id,
          credentials: creds,
          householdId: household.id,
          authToken: session.access_token,
          startDate: startDate.toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה לא ידועה')
      setResult(data); setStep('done'); onImported?.()
    } catch (err) {
      setError(err.message); setStep('error')
    }
  }

  // ────────── EXCEL/PDF IMPORT ──────────
  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name); setError(''); setPreview(null)

    if (file.name.toLowerCase().endsWith('.pdf')) {
      handlePdf(file)
      return
    }

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const rows = parseCSV(ev.target.result)
        const parsed = parseRows(rows, file.name)
        if (parsed.total === 0) {
          setError('לא נמצאו עסקאות בקובץ. נסה לשמור כ-CSV מתוך Excel.')
        } else {
          setPreview(parsed)
        }
      } catch (err) {
        setError('לא ניתן לקרוא את הקובץ: ' + err.message)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  async function handlePdf(file) {
    setPdfLoading(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('לא מחובר')

      const arrayBuf = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuf)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const b64 = btoa(binary)

      const res = await fetch('/api/import-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: b64,
          householdId: household.id,
          authToken: session.access_token,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה בייבוא PDF')
      if (data.total === 0) {
        setError('לא נמצאו עסקאות ב-PDF. ייתכן שהפורמט אינו נתמך.')
        return
      }
      setResult({ added: data.added, total: data.total, accounts: [], preview: data.preview })
      setStep('done'); onImported?.()
    } catch (err) {
      setError('שגיאה: ' + err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  function parseCSV(text) {
    // Handle Windows line endings, split into lines
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    return lines.map(line => {
      // Split by comma or tab, handle quoted fields
      const cells = []
      let cur = '', inQ = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (c === '"') { inQ = !inQ }
        else if ((c === ',' || c === '\t') && !inQ) { cells.push(cur.trim()); cur = '' }
        else cur += c
      }
      cells.push(cur.trim())
      return cells
    })
  }

  function parseRows(rows, filename) {
    const txns = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length < 3) continue
      const txn = parseRow(row)
      if (txn) txns.push(txn)
    }
    return { txns, total: txns.length }
  }

  function parseRow(row) {
    let dateStr = '', desc = '', amount = 0

    for (let i = 0; i < row.length; i++) {
      const cell = String(row[i] ?? '').trim()
      if (!cell) continue

      // Date detection (DD/MM/YYYY or DD.MM.YYYY)
      if (!dateStr) {
        const m = cell.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/)
        if (m) {
          const y = m[3].length === 2 ? '20' + m[3] : m[3]
          dateStr = `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
          continue
        }
      }

      // Amount: numeric-looking cell (may have commas, minus)
      const numStr = cell.replace(/,/g, '').replace(/\s/g, '')
      const n = parseFloat(numStr)
      if (!isNaN(n) && Math.abs(n) > 0 && Math.abs(n) < 10_000_000 && !cell.match(/^\d{5,}$/)) {
        if (!amount) amount = n
        continue
      }

      // Description: non-numeric text longer than 2 chars
      if (cell.length > 2 && isNaN(numStr)) {
        if (cell.length > desc.length) desc = cell
      }
    }

    if (!dateStr || !amount) return null
    if (dateStr < '2010-01-01' || dateStr > '2030-12-31') return null

    return {
      date: dateStr,
      description: desc || 'עסקה מהבנק',
      amount: Math.abs(amount),
      type: amount < 0 ? 'expense' : 'income',
    }
  }

  async function submitImport() {
    if (!preview?.txns?.length) return
    setImporting(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('לא מחובר')

      const { data: fRow } = await supabase
        .from('transactions').select('family_id').not('family_id','is',null).limit(1).maybeSingle()
      const familyId = fRow?.family_id ?? null

      const rows = preview.txns.map((t, i) => ({
        household_id: household.id,
        ...(familyId ? { family_id: familyId } : {}),
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category_id: 'other',
        member: 'family',
        external_id: `excel_${fileName}_${i}_${t.date}_${t.amount}`,
      }))

      const { error: err, count } = await supabase
        .from('transactions')
        .upsert(rows, { onConflict: 'external_id', ignoreDuplicates: true, count: 'exact' })

      if (err) throw err
      setResult({ added: count ?? rows.length, total: rows.length, accounts: [] })
      setStep('done'); onImported?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  // ────────── RENDER ──────────
  return (
    <div className={styles.bg} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.handle} />

        <div className={styles.header}>
          <div className={styles.bankBadge}>
            <span className={styles.bankIcon}>{bank.icon}</span>
            <span className={styles.bankName}>{mode === 'import' ? 'ייבוא מאקסל' : `${bank.label} — סנכרון`}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Mode tabs */}
        {step === 'form' && (
          <div className={styles.modeTabs}>
            {MODES.map(m => (
              <button key={m.id}
                className={`${styles.modeTab} ${mode === m.id ? styles.modeTabActive : ''}`}
                onClick={() => { setMode(m.id); setError(''); setPreview(null) }}>
                <span>{m.icon}</span> {m.label}
              </button>
            ))}
          </div>
        )}

        {/* ── SYNC FORM ── */}
        {step === 'form' && mode === 'sync' && (
          <form onSubmit={submitSync} className={styles.form}>
            {/* Bank selector */}
            <div className={styles.fieldWrap}>
              <label className={styles.label}>בנק</label>
              <div className={styles.bankGrid}>
                {BANKS.map(b => (
                  <button key={b.id} type="button"
                    className={`${styles.bankBtn} ${bank.id === b.id ? styles.bankBtnActive : ''}`}
                    onClick={() => { setBank(b); setCreds({}) }}>
                    <span>{b.icon}</span>
                    <span>{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.notice}>
              <span className={styles.noticeIcon}>🔒</span>
              <p>הסיסמה מועברת ישירות לבנק ו<strong>לא נשמרת</strong> אצלנו.</p>
            </div>

            {/* Credential fields */}
            {bank.fields.map(field => (
              <div key={field} className={styles.fieldWrap}>
                <label className={styles.label}>{FIELD_LABELS[field]}</label>
                {field === 'password' ? (
                  <div className={styles.passWrap}>
                    <input className={styles.input}
                      type={showPass ? 'text' : 'password'}
                      placeholder="סיסמת הבנק" dir="ltr" required
                      value={creds[field] || ''}
                      onChange={e => setCreds(c => ({ ...c, [field]: e.target.value }))} />
                    <button type="button" className={styles.eyeBtn} tabIndex={-1}
                      onClick={() => setShowPass(v => !v)}>
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                ) : (
                  <input className={styles.input}
                    type="text" inputMode={field === 'id' ? 'numeric' : 'text'}
                    placeholder={FIELD_LABELS[field]} dir="ltr" required
                    value={creds[field] || ''}
                    onChange={e => setCreds(c => ({ ...c, [field]: e.target.value }))} />
                )}
              </div>
            ))}

            <div className={styles.fieldWrap}>
              <label className={styles.label}>טווח זמן</label>
              <div className={styles.rangeRow}>
                {RANGE_OPTIONS.map(o => (
                  <button key={o.months} type="button"
                    className={`${styles.rangeBtn} ${months === o.months ? styles.rangeActive : ''}`}
                    onClick={() => setMonths(o.months)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className={styles.submitBtn}>סנכרן עסקאות ←</button>
          </form>
        )}

        {/* ── EXCEL IMPORT FORM ── */}
        {step === 'form' && mode === 'import' && (
          <div className={styles.form}>
            <div className={styles.notice}>
              <span className={styles.noticeIcon}>📋</span>
              <p>הורד תנועות חשבון מאתר הבנק כ-<strong>CSV</strong> או <strong>PDF</strong> ועלה כאן. עובד עם כל הבנקים.</p>
            </div>

            <div className={styles.fieldWrap}>
              <label className={styles.label}>קובץ מהבנק (CSV או PDF)</label>
              <button type="button" className={styles.fileBtn}
                onClick={() => fileRef.current?.click()}
                disabled={pdfLoading}>
                {pdfLoading ? '⏳ מעבד PDF...' : `📂 ${fileName || 'בחר קובץ CSV / PDF...'}`}
              </button>
              <input ref={fileRef} type="file" accept=".csv,.txt,.pdf"
                style={{ display: 'none' }} onChange={handleFile} />
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            {preview && (
              <div className={styles.previewBox}>
                <div className={styles.previewHeader}>
                  <span>נמצאו <strong>{preview.total}</strong> עסקאות לייבוא</span>
                </div>
                <div className={styles.previewRows}>
                  {preview.txns.slice(0, 5).map((t, i) => (
                    <div key={i} className={styles.previewRow}>
                      <span className={styles.previewDate}>{t.date}</span>
                      <span className={styles.previewDesc}>{t.description}</span>
                      <span className={`${styles.previewAmt} ${t.type === 'expense' ? styles.expense : styles.income}`}>
                        {t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString('he-IL')} ₪
                      </span>
                    </div>
                  ))}
                  {preview.total > 5 && (
                    <p className={styles.previewMore}>ועוד {preview.total - 5} עסקאות...</p>
                  )}
                </div>
                <button className={styles.submitBtn} onClick={submitImport} disabled={importing}>
                  {importing ? 'מייבא...' : `ייבא ${preview.total} עסקאות ←`}
                </button>
              </div>
            )}

            {!preview && !fileName && (
              <div className={styles.importHint}>
                <p className={styles.importHintTitle}>איך להוריד מהבנק?</p>
                <ul className={styles.importHintList}>
                  <li>דיסקונט: תנועות חשבון → ייצוא → PDF (נתמך!) או CSV</li>
                  <li>לאומי: תנועות בחשבון → הורדת נתונים → CSV</li>
                  <li>הפועלים: פעולות בחשבון → CSV/Excel → שמור כ-CSV</li>
                  <li>מזרחי: תנועות בחשבון → ייצוא → CSV</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── LOADING ── */}
        {step === 'loading' && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p className={styles.phase}>{phase}</p>
            <p className={styles.phaseSub}>אל תסגור את החלון</p>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && result && (
          <div className={styles.doneWrap}>
            <div className={styles.doneIcon}>✓</div>
            <h3 className={styles.doneTitle}>הצליח!</h3>
            <p className={styles.doneSub}>
              נוספו <strong>{result.added}</strong> עסקאות חדשות
              {result.total > result.added ? ` (${result.total - result.added} כבר היו קיימות)` : ''}
            </p>
            {result.accounts?.map(a => (
              <div key={a.number} className={styles.accountRow}>
                <span>חשבון {a.number}</span>
                <span>{a.txns} עסקאות</span>
              </div>
            ))}
            {result.preview?.length > 0 && (
              <div className={styles.previewBox} style={{ width: '100%' }}>
                <div className={styles.previewHeader}>תצוגה מקדימה</div>
                <div className={styles.previewRows}>
                  {result.preview.slice(0, 5).map((t, i) => (
                    <div key={i} className={styles.previewRow}>
                      <span className={styles.previewDate}>{t.date}</span>
                      <span className={styles.previewDesc}>{t.description}</span>
                      <span className={`${styles.previewAmt} ${t.type === 'expense' ? styles.expense : styles.income}`}>
                        {t.type === 'expense' ? '-' : '+'}{t.amount?.toLocaleString('he-IL')} ₪
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button className={styles.submitBtn} onClick={onClose}>סגור</button>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === 'error' && (
          <div className={styles.errorWrap}>
            <div className={styles.errorIcon}>✕</div>
            <h3 className={styles.errorTitle}>הסנכרון נכשל</h3>
            <p className={styles.errorMsg}>{error}</p>
            <button className={styles.submitBtn} onClick={() => setStep('form')}>נסה שוב</button>
          </div>
        )}
      </div>
    </div>
  )
}
