export const CATEGORIES = {
  expenses: [
    { id: 'super',      label: 'סופר',               icon: '🛒', color: '#10b981' },
    { id: 'car',        label: 'רכב + דלק',           icon: '⛽', color: '#f59e0b' },
    { id: 'bills',      label: 'חשבונות',             icon: '📄', color: '#6366f1' },
    { id: 'insurance',  label: 'ביטוחים',             icon: '🛡️', color: '#8b5cf6' },
    { id: 'dining',     label: 'אוכל בחוץ',           icon: '🍽️', color: '#f97316' },
    { id: 'bigud',      label: 'ביגוד',               icon: '👕', color: '#ec4899' },
    { id: 'education',  label: 'לימודים',             icon: '📚', color: '#3b82f6' },
    { id: 'health',     label: 'רפואה',               icon: '💊', color: '#14b8a6' },
    { id: 'transport',  label: 'תחבורה',              icon: '🚌', color: '#64748b' },
    { id: 'home',       label: 'הוצאות בית',          icon: '🏠', color: '#84cc16' },
    { id: 'pampering',  label: 'פינוקים',             icon: '🎭', color: '#a855f7' },
    { id: 'cosmet',     label: 'קוסמטיקה',            icon: '💄', color: '#f472b6' },
    { id: 'children',   label: 'מסגרות ילדים',        icon: '🧒', color: '#fb923c' },
    { id: 'savings',    label: 'חסכון',               icon: '🏦', color: '#0ea5e9' },
    { id: 'charity',    label: 'צדקה',                icon: '❤️', color: '#ef4444' },
    { id: 'events',     label: 'אירועים ומתנות',      icon: '🎁', color: '#c084fc' },
    { id: 'other',      label: 'אחר',                 icon: '📦', color: '#94a3b8' },
  ],
  income: [
    { id: 'salary_uri',  label: 'משכורת אורי', icon: '💰', color: '#10b981' },
    { id: 'salary_afek', label: 'משכורת אפק',  icon: '💰', color: '#6366f1' },
    { id: 'other_in',    label: 'הכנסה אחרת',  icon: '📥', color: '#94a3b8' },
  ],
}

export const USERS = [
  { id: 'uri',    name: 'אורי',   avatar: 'או', color: '#6366f1' },
  { id: 'afek',   name: 'אפק',   avatar: 'אפ', color: '#ec4899' },
  { id: 'family', name: 'משפחה', avatar: 'מ',  color: '#94a3b8' },
]

export const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

const now = new Date()
export const CURRENT_MONTH = now.getMonth()
export const CURRENT_YEAR = now.getFullYear()

// Default budget plan per category (₪/month)
export const DEFAULT_BUDGET = {
  super: 2500,
  car: 1200,
  bills: 1200,
  insurance: 600,
  dining: 500,
  bigud: 300,
  education: 400,
  health: 300,
  transport: 400,
  home: 600,
  pampering: 300,
  cosmet: 200,
  children: 800,
  savings: 1000,
  charity: 200,
  events: 300,
  other: 300,
}

// App loads all data from Google Sheets — no seed data
export const SEED_TRANSACTIONS = []
