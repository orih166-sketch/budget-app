import { useState, useRef, useEffect } from 'react'
import { Home as HomeIcon, List, Plus, TrendingUp, PiggyBank } from 'lucide-react'
import Home from './Home.jsx'
import Activity from './Activity.jsx'
import Cashflow from './Cashflow.jsx'
import Savings from './Savings.jsx'
import SettingsScreen from './SettingsScreen.jsx'
import Alerts from './Alerts.jsx'
import Import from './Import.jsx'
import ApplePay from './ApplePay.jsx'
import Budget from './Budget.jsx'
import Summary from './Summary.jsx'
import { ymd } from './format.js'
import s from './sheet.module.css'

const TABS = [
  { id: 'home', label: 'בית', Icon: HomeIcon },
  { id: 'activity', label: 'תנועות', Icon: List },
  { id: 'add' },
  { id: 'cashflow', label: 'תזרים', Icon: TrendingUp },
  { id: 'savings', label: 'חיסכון', Icon: PiggyBank },
]

const NAMES = { 'orih166@gmail.com': 'אורי', 'afek2002m@gmail.com': 'אפק' }

export default function SheetApp({ user, logout }) {
  const thisMonth = ymd(new Date()).slice(0, 7)
  const [screen, setScreen] = useState('home')
  const [month, setMonth] = useState(thisMonth)
  const [focusAdd, setFocusAdd] = useState(0)

  // index.css של האפליקציה הישנה צובע את הדף בכחול כהה; הוא נראה בקצוות המסך באייפון
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const paint = () => {
      const c = mq.matches ? '#15160F' : '#F7F5EC'
      document.documentElement.style.background = c
      document.body.style.background = c
    }
    paint()
    mq.addEventListener('change', paint)
    return () => mq.removeEventListener('change', paint)
  }, [])

  const scroller = useRef(null)
  const [arg, setArg] = useState(null)
  const go = (id, a = null) => { setScreen(id); setArg(a); scroller.current?.scrollTo(0, 0) }
  const userName = NAMES[user?.email?.toLowerCase()] || ''

  return (
    <div className={s.app} ref={scroller} key={screen + (arg || '')}>
      {screen === 'home' && <Home month={month} setMonth={setMonth} thisMonth={thisMonth} go={go} userName={userName} />}
      {screen === 'activity' && <Activity focusInput={focusAdd} go={go} />}
      {screen === 'cashflow' && <Cashflow />}
      {screen === 'savings' && <Savings />}
      {screen === 'settings' && <SettingsScreen back={() => go('home')} go={go} user={user} logout={logout} />}
      {screen === 'alerts' && <Alerts back={() => go('home')} />}
      {screen === 'import' && <Import back={() => go('activity')} />}
      {screen === 'applepay' && <ApplePay back={() => go('settings')} />}
      {screen === 'budget' && <Budget initialMonth={arg} back={() => go('home')} />}
      {screen === 'summary' && <Summary initialMonth={arg} back={() => go('home')} go={go} />}

      <nav className={s.nav} aria-label="ניווט ראשי">
        <div className={s.navInner}>
          {TABS.map(t => t.id === 'add' ? (
            <button key="add" type="button" className={s.fab} aria-label="הוספת הוצאה"
              onClick={() => { go('activity'); setFocusAdd(n => n + 1) }}>
              <Plus size={26} strokeWidth={2.5} aria-hidden="true" />
            </button>
          ) : (
            <button key={t.id} type="button" aria-current={screen === t.id ? 'page' : undefined}
              className={`${s.navBtn} ${screen === t.id ? s.navOn : ''}`} onClick={() => go(t.id)}>
              <t.Icon size={22} aria-hidden="true" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
