import { useState, useEffect } from 'react'
import Login from './components/Login.jsx'
import Dashboard from './components/Dashboard.jsx'
import Transactions from './components/Transactions.jsx'
import Budget from './components/Budget.jsx'
import Reports from './components/Reports.jsx'
import Savings from './components/Savings.jsx'
import AddTransaction from './components/AddTransaction.jsx'
import MonthNav from './components/MonthNav.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import FamilySettings from './components/FamilySettings.jsx'
import { HouseholdProvider, useHousehold } from './context/HouseholdContext.jsx'
import { useTransactions } from './hooks/useTransactions.js'
import { useSavingsGoals } from './hooks/useSavingsGoals.js'
import { useAuth } from './hooks/useAuth.js'
import { USERS, CURRENT_MONTH, CURRENT_YEAR } from './data.js'
import styles from './App.module.css'

const TABS = [
  { id: 'dashboard',    label: 'בית',    icon: '⌂' },
  { id: 'transactions', label: 'עסקאות', icon: '↕' },
  { id: 'budget',       label: 'תקציב',  icon: '◎' },
  { id: 'savings',      label: 'חיסכון', icon: '🎯' },
  { id: 'reports',      label: 'דוחות',  icon: '▦' },
]

function AppShell({ user, isPasswordRecovery, logout, updatePassword }) {
  const { household, acceptInvitation } = useHousehold()
  const { transactions, budget, expectedIncome, setExpectedIncome, addTransaction, updateTransaction, deleteTransaction, updateBudget } =
    useTransactions()
  const { goals, loading: goalsLoading, addGoal, updateGoal, depositToGoal, deleteGoal } =
    useSavingsGoals()

  const [tab, setTab]             = useState('dashboard')
  const [tabKey, setTabKey]       = useState(0)
  const [sideOpen, setSide]       = useState(false)
  const [sideClosing, setClosing] = useState(false)
  const [addOpen, setAdd]         = useState(false)
  const [familyOpen, setFamily]   = useState(false)

  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
  const [selectedYear,  setSelectedYear]  = useState(CURRENT_YEAR)
  const [selectedUser,  setSelectedUser]  = useState('family')

  const [newPassword, setNewPassword]   = useState('')
  const [pwdLoading, setPwdLoading]     = useState(false)
  const [pwdError, setPwdError]         = useState('')

  // Accept invite from URL on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (invite) {
      acceptInvitation(invite)
        .catch(e => alert('שגיאה בהצטרפות: ' + e.message))
        .finally(() => {
          window.history.replaceState({}, '', window.location.pathname)
        })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function closeSide() {
    setClosing(true)
    setTimeout(() => { setSide(false); setClosing(false) }, 210)
  }

  async function handlePasswordUpdate(e) {
    e.preventDefault()
    if (newPassword.length < 6) { setPwdError('סיסמה חייבת להכיל לפחות 6 תווים'); return }
    setPwdLoading(true); setPwdError('')
    try {
      await updatePassword(newPassword)
    } catch (err) {
      setPwdError(err.message || 'שגיאה בעדכון הסיסמה')
    } finally {
      setPwdLoading(false)
    }
  }

  // Password recovery overlay (user clicked reset link in email)
  if (isPasswordRecovery) {
    return (
      <div className={styles.pwdRecoveryWrap}>
        <div className={styles.pwdRecoveryCard}>
          <div className={styles.logo}>🔐</div>
          <h2 className={styles.pwdRecoveryTitle}>קביעת סיסמה חדשה</h2>
          <form onSubmit={handlePasswordUpdate} className={styles.pwdRecoveryForm}>
            <input
              className={styles.pwdRecoveryInput}
              type="password"
              placeholder="סיסמה חדשה (לפחות 6 תווים)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              dir="ltr"
              required
            />
            {pwdError && <p className={styles.pwdError}>{pwdError}</p>}
            <button className={styles.pwdRecoveryBtn} type="submit" disabled={pwdLoading}>
              {pwdLoading ? '...' : 'שמור סיסמה חדשה'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button className={styles.menuBtn} onClick={() => setSide(o => !o)}>☰</button>
        <h1 className={styles.title}>כלכלת בית</h1>
        <span className={styles.userChip}>{user.name}</span>
      </header>

      {tab !== 'reports' && tab !== 'savings' && (
        <MonthNav
          month={selectedMonth} year={selectedYear} onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y) }}
          selectedUser={selectedUser} onUserChange={setSelectedUser}
        />
      )}

      {sideOpen && (
        <div className={`${styles.overlay} ${sideClosing ? styles.overlayClosing : ''}`} onClick={closeSide}>
          <aside className={`${styles.sidebar} ${sideClosing ? styles.sidebarClosing : ''}`} onClick={e => e.stopPropagation()}>
            <div className={styles.sideTop}>
              <div className={styles.sideAvatar}>{user.avatar}</div>
              <div>
                <p className={styles.sideName}>{user.name}</p>
                <p className={styles.sideSub}>{user.email || 'ניהול תקציב הבית'}</p>
              </div>
            </div>
            <nav className={styles.sideNav}>
              {TABS.map(t => (
                <button key={t.id} className={`${styles.sideItem} ${tab===t.id ? styles.sideActive : ''}`}
                  onClick={() => { setTab(t.id); closeSide() }}>
                  <span>{t.icon}</span><span>{t.label}</span>
                </button>
              ))}
              <button className={styles.sideItem}
                onClick={() => { setFamily(true); closeSide() }}>
                <span>👨‍👩‍👧</span><span>הגדרות משפחה</span>
              </button>
            </nav>
            <button className={styles.logoutBtn} onClick={() => { logout(); closeSide() }}>← יציאה</button>
          </aside>
        </div>
      )}

      <main className={styles.main}>
        <ErrorBoundary>
          <div key={tabKey} className={styles.tabPane}>
            {tab === 'dashboard'    && <Dashboard transactions={transactions} budget={budget} user={user} selectedMonth={selectedMonth} selectedYear={selectedYear} selectedUser={selectedUser} expectedIncome={expectedIncome} onSetExpectedIncome={setExpectedIncome} />}
            {tab === 'transactions' && <Transactions transactions={transactions} onDelete={deleteTransaction} onUpdate={updateTransaction} selectedMonth={selectedMonth} selectedYear={selectedYear} onMonthChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y) }} selectedUser={selectedUser} />}
            {tab === 'budget'       && <Budget transactions={transactions} budget={budget} onUpdateBudget={updateBudget} selectedMonth={selectedMonth} selectedYear={selectedYear} />}
            {tab === 'savings'      && <Savings goals={goals} loading={goalsLoading} onAdd={addGoal} onUpdate={updateGoal} onDeposit={depositToGoal} onDelete={deleteGoal} />}
            {tab === 'reports'      && <Reports transactions={transactions} />}
          </div>
        </ErrorBoundary>
      </main>

      <button className={styles.fab} onClick={() => setAdd(true)}>＋</button>

      <nav className={styles.bottomNav}>
        {TABS.map(t => (
          <button key={t.id} className={`${styles.navItem} ${tab===t.id ? styles.navActive : ''}`} onClick={() => { setTab(t.id); setTabKey(k => k+1) }}>
            <span className={styles.navIcon}>{t.icon}</span>
            <span className={styles.navLabel}>{t.label}</span>
          </button>
        ))}
      </nav>

      {addOpen && <AddTransaction onAdd={addTransaction} onClose={() => setAdd(false)} user={user} />}
      {familyOpen && <FamilySettings user={user} onClose={() => setFamily(false)} />}
    </div>
  )
}

export default function App() {
  const { user, isPasswordRecovery, login, register, logout, sendResetCode, updatePassword, loginWithGoogle, sendPhoneOtp, verifyPhoneOtp } = useAuth()

  if (user === undefined) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={login} onRegister={register} onSendResetCode={sendResetCode} onLoginWithGoogle={loginWithGoogle} onSendPhoneOtp={sendPhoneOtp} onVerifyPhoneOtp={verifyPhoneOtp} />
  }

  return (
    <HouseholdProvider user={user}>
      <AppShell
        user={user}
        isPasswordRecovery={isPasswordRecovery}
        logout={logout}
        updatePassword={updatePassword}
      />
    </HouseholdProvider>
  )
}
