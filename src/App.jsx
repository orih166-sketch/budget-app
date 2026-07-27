import { useState, useEffect, useCallback } from 'react'
import Login from './components/Login.jsx'
import Dashboard from './components/Dashboard.jsx'
import Transactions from './components/Transactions.jsx'
import Reports from './components/Reports.jsx'
import NetWorth from './components/NetWorth.jsx'
import Settings from './components/Settings.jsx'
import AddTransaction from './components/AddTransaction.jsx'
import MonthNav from './components/MonthNav.jsx'
import Navbar from './components/Navbar.jsx'
import Logo from './components/Logo.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Toast from './components/Toast.jsx'
import { requestNotificationPermission, listenToForegroundMessages } from './notifications.js'
import FamilySettings from './components/FamilySettings.jsx'
import BankConnect from './components/BankConnect.jsx'
import Onboarding, { shouldShowOnboarding } from './components/Onboarding.jsx'
import { HouseholdProvider, useHousehold } from './context/HouseholdContext.jsx'
import { useTransactions } from './hooks/useTransactions.js'
import { useAccounts } from './hooks/useAccounts.js'
import { useRecurring } from './hooks/useRecurring.js'
import { useAuth } from './hooks/useAuth.js'
import { useCategoryBudgets } from './hooks/useCategoryBudgets.js'
import { checkBudgetAlert } from './utils/budgetNotify.js'
import { CURRENT_MONTH, CURRENT_YEAR } from './data.js'
import styles from './App.module.css'

function AppShell({ user, isPasswordRecovery, logout, updatePassword }) {
  const { acceptInvitation } = useHousehold()
  const { household } = useHousehold()
  const { budgets } = useCategoryBudgets()

  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding)
  const [tab, setTab] = useState('dashboard')
  const [tabKey, setTabKey] = useState(0)
  const [addOpen, setAdd] = useState(false)
  const [familyOpen, setFamily] = useState(false)
  const [bankOpen, setBank] = useState(false)
  const [notifCount] = useState(0)
  const [notifToast, setNotifToast] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [selectedUser] = useState('family')

  const {
    transactions, budget, expectedIncome, setExpectedIncome,
    addTransaction, updateTransaction, deleteTransaction, updateBudget,
    txError, clearTxError,
  } = useTransactions(selectedYear, selectedMonth)
  const { netWorth, totalAssets, totalLiab } = useAccounts()
  const recurring = useRecurring()

  // הוסף עסקה + בדוק חריגה מתקציב
  async function handleAddTransaction(tx) {
    await addTransaction(tx)
    checkBudgetAlert({ newTx: tx, transactions, budgets, householdId: household?.id })
  }

  const showNotif = useCallback(({ title, body }) => {
    setNotifToast(`${title}: ${body}`)
  }, [])

  useEffect(() => {
    requestNotificationPermission(user?.id).catch(() => {})
    const unsub = listenToForegroundMessages(showNotif)
    return unsub
  }, [user?.id, showNotif])

  const [newPassword, setNewPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')

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

  async function handlePasswordUpdate(e) {
    e.preventDefault()
    if (newPassword.length < 6) { setPwdError('סיסמה חייבת להכיל לפחות 6 תווים'); return }
    setPwdLoading(true)
    setPwdError('')
    try {
      await updatePassword(newPassword)
    } catch (err) {
      setPwdError(err.message || 'שגיאה בעדכון הסיסמה')
    } finally {
      setPwdLoading(false)
    }
  }

  if (isPasswordRecovery) {
    return (
      <div className={styles.pwdRecoveryWrap}>
        <div className={styles.pwdRecoveryCard}>
          <Logo size={48} />
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

  const showMonthNav = tab === 'dashboard' || tab === 'transactions' || tab === 'settings'
  const showFab = tab !== 'settings' && tab !== 'reports'

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <Logo size={36} />
        <h1 className={styles.title}>כלכלת בית</h1>
        <button type="button" className={styles.bellBtn} aria-label="התראות">
          🔔
          {notifCount > 0 && <span className={styles.bellBadge}>{notifCount}</span>}
        </button>
      </header>

      {showMonthNav && (
        <MonthNav
          month={selectedMonth}
          year={selectedYear}
          onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y) }}
        />
      )}

      <main className={styles.main}>
        <ErrorBoundary>
          <div key={tabKey} className={styles.tabPane}>
            {tab === 'dashboard' && (
              <Dashboard
                transactions={transactions}
                budget={budget}
                user={user}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                selectedUser={selectedUser}
                expectedIncome={expectedIncome}
                onSetExpectedIncome={setExpectedIncome}
                netWorth={netWorth}
                totalAssets={totalAssets}
                totalLiab={totalLiab}
                alertCount={notifCount}
              />
            )}
            {tab === 'transactions' && (
              <Transactions
                transactions={transactions}
                onDelete={deleteTransaction}
                onUpdate={updateTransaction}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y) }}
                selectedUser={selectedUser}
                recurring={recurring}
              />
            )}
            {tab === 'reports' && <Reports transactions={transactions} />}
            {tab === 'networth' && <NetWorth />}
            {tab === 'settings' && (
              <Settings
                user={user}
                logout={logout}
                transactions={transactions}
                budget={budget}
                onUpdateBudget={updateBudget}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                expectedIncome={expectedIncome}
                onSetExpectedIncome={setExpectedIncome}
                onOpenBank={() => setBank(true)}
                onOpenFamily={() => setFamily(true)}
              />
            )}
          </div>
        </ErrorBoundary>
      </main>

      {showFab && (
        <button type="button" className={styles.fab} onClick={() => setAdd(true)} aria-label="הוסף עסקה">＋</button>
      )}

      <Navbar
        active={tab}
        onChange={id => { setTab(id); setTabKey(k => k + 1) }}
      />

      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      {addOpen && (
        <AddTransaction
          onAdd={handleAddTransaction}
          onAddRecurring={recurring.addRule}
          onClose={() => setAdd(false)}
          user={user}
        />
      )}
      {familyOpen && <FamilySettings user={user} onClose={() => setFamily(false)} />}
      {bankOpen && <BankConnect onClose={() => setBank(false)} onImported={() => setBank(false)} />}
      <Toast message={txError} onClose={clearTxError} />
      <Toast message={notifToast} onClose={() => setNotifToast('')} />
    </div>
  )
}

export default function App() {
  const {
    user, isPasswordRecovery, login, register, logout,
    sendResetCode, updatePassword, loginWithGoogle, sendPhoneOtp, verifyPhoneOtp,
  } = useAuth()

  if (user === undefined) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
      </div>
    )
  }

  if (!user) {
    return (
      <Login
        onLogin={login}
        onRegister={register}
        onSendResetCode={sendResetCode}
        onLoginWithGoogle={loginWithGoogle}
        onSendPhoneOtp={sendPhoneOtp}
        onVerifyPhoneOtp={verifyPhoneOtp}
      />
    )
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
