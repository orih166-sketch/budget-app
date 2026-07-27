import { useState } from 'react'
import { useHousehold } from '../context/HouseholdContext.jsx'
import { HOUSEHOLD } from '../data/household.js'
import Budget from './Budget.jsx'
import styles from './Settings.module.css'

const NOTIFICATIONS = [
  { id: 'newTx', label: 'עסקה חדשה', default: true },
  { id: 'budgetOver', label: 'חריגה מתקציב', default: true },
  { id: 'salary', label: 'משכורת נכנסה', default: true },
  { id: 'weekly', label: 'סיכום שבועי', default: false },
]

export default function Settings({
  user,
  logout,
  transactions,
  budget,
  onUpdateBudget,
  selectedMonth,
  selectedYear,
  expectedIncome,
  onSetExpectedIncome,
  onOpenBank,
  onOpenFamily,
}) {
  const { household } = useHousehold()
  const [subScreen, setSubScreen] = useState(null)
  const [incomeInput, setIncomeInput] = useState('')
  const [notifs, setNotifs] = useState(() => {
    const saved = localStorage.getItem('kb_notifications')
    if (saved) try { return JSON.parse(saved) } catch { /* ignore */ }
    return Object.fromEntries(NOTIFICATIONS.map(n => [n.id, n.default]))
  })
  const [darkMode] = useState(true)
  const [showAmounts, setShowAmounts] = useState(true)
  const [sheetsSync, setSheetsSync] = useState(false)

  function toggleNotif(id) {
    setNotifs(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem('kb_notifications', JSON.stringify(next))
      return next
    })
  }

  const MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

  if (subScreen === 'income') {
    const currentVal = incomeInput !== '' ? incomeInput : (expectedIncome > 0 ? String(expectedIncome) : '')
    function handleSave() {
      const amount = parseFloat(currentVal.replace(/[^\d.]/g, '')) || 0
      onSetExpectedIncome(amount)
      setSubScreen(null)
    }
    return (
      <div className={`${styles.wrap} slide-in`}>
        <button type="button" className={styles.backBtn} onClick={() => setSubScreen(null)}>→ חזרה</button>
        <h2 className={styles.pageTitle}>הכנסות — {MONTH_NAMES[selectedMonth]} {selectedYear}</h2>
        <div className={styles.card}>
          <p style={{ fontSize: '0.85rem', color: 'var(--c-text-2)', marginBottom: '1rem' }}>
            הכנסות משתנות מחודש לחודש. הזן את הסכום הצפוי לחודש זה — ישמש לחישוב "נותר" ו"חיסכון".
          </p>
          <div className={styles.incomeRow}>
            <span>הכנסה צפויה החודש</span>
          </div>
          <input
            type="number"
            dir="ltr"
            placeholder="0"
            value={currentVal}
            onChange={e => setIncomeInput(e.target.value)}
            style={{
              width: '100%', padding: '0.75rem', fontSize: '1.1rem',
              background: 'var(--c-surface)', border: '1px solid var(--c-border)',
              borderRadius: '8px', color: 'var(--c-text)', marginBottom: '1rem',
            }}
          />
          <button
            type="button"
            onClick={handleSave}
            style={{
              width: '100%', padding: '0.75rem', background: 'var(--green)',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '1rem', cursor: 'pointer',
            }}
          >
            שמור
          </button>
          {expectedIncome > 0 && (
            <div className={`${styles.incomeRow} ${styles.incomeTotal}`} style={{ marginTop: '1rem' }}>
              <span>שמור לחודש זה</span>
              <span dir="ltr">₪{expectedIncome.toLocaleString('he-IL')}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (subScreen === 'budget') {
    return (
      <div className={`${styles.wrap} slide-in`}>
        <button type="button" className={styles.backBtn} onClick={() => setSubScreen(null)}>→ חזרה</button>
        <Budget
          transactions={transactions}
          budget={budget}
          onUpdateBudget={onUpdateBudget}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>👤 פרופיל משפחתי</h3>
        <div className={styles.profileCard}>
          <div className={styles.profileNames}>
            {HOUSEHOLD.members.uri.name} 💞 {HOUSEHOLD.members.afek.name}
          </div>
          <div className={styles.profileSub}>{household?.name || HOUSEHOLD.name}</div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>💰 פיננסי</h3>
        <button type="button" className={styles.rowBtn} onClick={() => setSubScreen('income')}>
          <span>הכנסות חודשיות</span><span className={styles.chevron}>‹</span>
        </button>
        <button type="button" className={styles.rowBtn} onClick={() => setSubScreen('budget')}>
          <span>קטגוריות / תקציב</span><span className={styles.chevron}>‹</span>
        </button>
        <div className={styles.rowBtnStatic}>
          <span>מטבע ושפה</span>
          <span className={styles.muted}>₪ · עברית</span>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🔗 חיבורים</h3>
        <button type="button" className={styles.rowBtn} onClick={onOpenBank}>
          <span>בנק / ייבוא Excel</span>
          <span className={styles.badgeOk}>מחובר ✓</span>
        </button>
        <button type="button" className={styles.rowBtn} onClick={onOpenFamily}>
          <span>הגדרות משפחה</span><span className={styles.chevron}>‹</span>
        </button>
        <div className={styles.toggleRow}>
          <span>Google Sheets</span>
          <button
            type="button"
            className={`${styles.toggle} ${sheetsSync ? styles.toggleOn : ''}`}
            onClick={() => setSheetsSync(v => !v)}
            aria-pressed={sheetsSync}
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
        <div className={styles.rowBtnStatic}>
          <span>בוט WhatsApp</span>
          <span className={styles.badgeOk}>פעיל ✓</span>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🔔 התראות</h3>
        {NOTIFICATIONS.map(n => (
          <div key={n.id} className={styles.toggleRow}>
            <span>{n.label}</span>
            <button
              type="button"
              className={`${styles.toggle} ${notifs[n.id] ? styles.toggleOn : ''}`}
              onClick={() => toggleNotif(n.id)}
              aria-pressed={notifs[n.id]}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🎨 מראה</h3>
        <div className={styles.toggleRow}>
          <span>מצב כהה</span>
          <button type="button" className={`${styles.toggle} ${darkMode ? styles.toggleOn : ''}`} aria-pressed={darkMode}>
            <span className={styles.toggleKnob} />
          </button>
        </div>
        <div className={styles.toggleRow}>
          <span>הצגת סכומים</span>
          <button
            type="button"
            className={`${styles.toggle} ${showAmounts ? styles.toggleOn : ''}`}
            onClick={() => setShowAmounts(v => !v)}
            aria-pressed={showAmounts}
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>💾 דאטה וגיבוי</h3>
        <button type="button" className={styles.rowBtn} onClick={onOpenBank}>
          <span>ייצוא / ייבוא לאקסל</span><span className={styles.chevron}>‹</span>
        </button>
      </section>

      <section className={`${styles.section} ${styles.danger}`}>
        <h3 className={styles.sectionTitle}>⚠️ אזור מסוכן</h3>
        <button type="button" className={styles.dangerBtn}>נתק בנק</button>
        <button type="button" className={styles.dangerBtn}>מחק את כל הנתונים</button>
        <button type="button" className={styles.logoutBtn} onClick={logout}>יציאה מהחשבון</button>
      </section>
    </div>
  )
}
