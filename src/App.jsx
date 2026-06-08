import { useState } from 'react'
import Login from './components/Login.jsx'
import Dashboard from './components/Dashboard.jsx'
import Transactions from './components/Transactions.jsx'
import Budget from './components/Budget.jsx'
import Reports from './components/Reports.jsx'
import Savings from './components/Savings.jsx'
import AddTransaction from './components/AddTransaction.jsx'
import MonthNav from './components/MonthNav.jsx'
import { useTransactions } from './hooks/useTransactions.js'
import { useSavingsGoals } from './hooks/useSavingsGoals.js'
import { useAuth } from './hooks/useAuth.js'
import { USERS, CURRENT_MONTH, CURRENT_YEAR } from './data.js'
import styles from './App.module.css'

const TABS = [
  { id: 'dashboard',    label: 'בית',        icon: '⌂' },
  { id: 'transactions', label: 'עסקאות',     icon: '↕' },
  { id: 'budget',       label: 'תקציב',      icon: '◎' },
  { id: 'savings',      label: 'חיסכון',     icon: '🎯' },
  { id: 'reports',      label: 'דוחות',      icon: '▦' },
]

export default function App() {
  const { user, login, register, logout, sendResetCode, verifyResetCode } = useAuth()

  const [tab, setTab]           = useState('dashboard')
  const [sideOpen, setSide]     = useState(false)
  const [sideClosing, setClosing] = useState(false)
  const [addOpen, setAdd]       = useState(false)

  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
  const [selectedYear,  setSelectedYear]  = useState(CURRENT_YEAR)
  const [selectedUser,  setSelectedUser]  = useState('family')

  const { transactions, budget, expectedIncome, setExpectedIncome, addTransaction, updateTransaction, deleteTransaction, updateBudget } =
    useTransactions()
  const { goals, loading: goalsLoading, addGoal, updateGoal, depositToGoal, deleteGoal } = useSavingsGoals()

  function closeSide() {
    setClosing(true)
    setTimeout(() => { setSide(false); setClosing(false) }, 210)
  }

  function handleMonthChange(month, year) {
    setSelectedMonth(month)
    setSelectedYear(year)
  }

  function handleLogout() {
    logout()
    closeSide()
  }

  // Supabase auth initializing
  if (user === undefined) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner} />
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return <Login onLogin={login} onRegister={register}
      onSendResetCode={sendResetCode} onVerifyCode={verifyResetCode} />
  }

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.menuBtn} onClick={() => setSide(o => !o)}>☰</button>
        <h1 className={styles.title}>תקציב הבית</h1>
        <span className={styles.userChip}>{user.name}</span>
      </header>

      {/* Month navigator */}
      {tab !== 'reports' && tab !== 'investments' && tab !== 'savings' && (
        <MonthNav
          month={selectedMonth} year={selectedYear} onChange={handleMonthChange}
          selectedUser={selectedUser} onUserChange={setSelectedUser}
        />
      )}

      {/* Sidebar overlay */}
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
            </nav>
            <button className={styles.logoutBtn} onClick={handleLogout}>← יציאה</button>
          </aside>
        </div>
      )}

      {/* Content */}
      <main className={styles.main}>
        {tab === 'dashboard'    && <Dashboard transactions={transactions} budget={budget} user={user} selectedMonth={selectedMonth} selectedYear={selectedYear} selectedUser={selectedUser} expectedIncome={expectedIncome} onSetExpectedIncome={setExpectedIncome} />}
        {tab === 'transactions' && <Transactions transactions={transactions} onDelete={deleteTransaction} onUpdate={updateTransaction} selectedMonth={selectedMonth} selectedYear={selectedYear} onMonthChange={handleMonthChange} selectedUser={selectedUser} />}
        {tab === 'budget'       && <Budget transactions={transactions} budget={budget} onUpdateBudget={updateBudget} selectedMonth={selectedMonth} selectedYear={selectedYear} />}
        {tab === 'savings'      && <Savings goals={goals} loading={goalsLoading} onAdd={addGoal} onUpdate={updateGoal} onDeposit={depositToGoal} onDelete={deleteGoal} />}
        {tab === 'reports'      && <Reports transactions={transactions} />}
      </main>

      {/* FAB */}
      <button className={styles.fab} onClick={() => setAdd(true)}>＋</button>

      {/* Bottom nav */}
      <nav className={styles.bottomNav}>
        {TABS.map(t => (
          <button key={t.id} className={`${styles.navItem} ${tab===t.id ? styles.navActive : ''}`} onClick={() => setTab(t.id)}>
            <span className={styles.navIcon}>{t.icon}</span>
            <span className={styles.navLabel}>{t.label}</span>
          </button>
        ))}
      </nav>

      {addOpen && <AddTransaction onAdd={addTransaction} onClose={() => setAdd(false)} user={user} />}
    </div>
  )
}
