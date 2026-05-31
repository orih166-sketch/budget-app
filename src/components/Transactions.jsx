import { useState, useMemo } from 'react'
import { CATEGORIES, MONTHS, USERS } from '../data.js'
import styles from './Transactions.module.css'

const fmt = n => '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })
const allCats = [...CATEGORIES.expenses, ...CATEGORIES.income]
const cat = id => allCats.find(c => c.id === id)
const userInfo = id => USERS.find(u => u.id === id)

export default function Transactions({ transactions, onDelete, onUpdate, selectedMonth, selectedYear, onMonthChange, selectedUser = 'family' }) {
  const [search, setSearch]   = useState('')
  const [filterCat, setCat]   = useState('')
  const [filterType, setType] = useState('')
  const [editId, setEditId]   = useState(null)
  const [editForm, setForm]   = useState({})

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date)
      if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) return false
      if (selectedUser !== 'family' && t.user !== selectedUser) return false
      if (filterType && t.type !== filterType) return false
      if (filterCat  && t.category !== filterCat) return false
      if (search && !t.desc.includes(search)) return false
      return true
    }).sort((a,b) => b.date.localeCompare(a.date))
  }, [transactions, selectedMonth, selectedYear, selectedUser, filterType, filterCat, search])

  const totalIncome   = filtered.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0)
  const totalExpenses = filtered.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0)

  function startEdit(t) {
    setEditId(t.id)
    setForm({ desc: t.desc, amount: t.amount, category: t.category, date: t.date, user: t.user })
  }

  function saveEdit() {
    onUpdate(editId, { ...editForm, amount: parseFloat(editForm.amount) })
    setEditId(null)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.filters}>
        <input className={styles.search} placeholder="חיפוש..." value={search} onChange={e=>setSearch(e.target.value)} />
        <div className={styles.filterRow}>
          <select className={styles.sel} value={selectedMonth} onChange={e => onMonthChange(+e.target.value, selectedYear)}>
            {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select className={styles.sel} value={selectedYear} onChange={e => onMonthChange(selectedMonth, +e.target.value)}>
            {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
          <select className={styles.sel} value={filterType} onChange={e=>setType(e.target.value)}>
            <option value="">הכל</option>
            <option value="expense">הוצאות</option>
            <option value="income">הכנסות</option>
          </select>
        </div>
      </div>

      <div className={styles.summary}>
        <span className={styles.inc}>+{fmt(totalIncome)}</span>
        <span className={styles.divider}>|</span>
        <span className={styles.exp}>-{fmt(totalExpenses)}</span>
        <span className={styles.divider}>|</span>
        <span className={totalIncome-totalExpenses>=0 ? styles.inc : styles.exp}>{fmt(totalIncome-totalExpenses)}</span>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 && <p className={styles.empty}>אין עסקאות לתקופה זו</p>}
        {filtered.map(t => {
          const c = cat(t.category)
          const u = userInfo(t.user)
          if (editId === t.id) {
            return (
              <div key={t.id} className={styles.editCard}>
                <input className={styles.input} value={editForm.desc}   onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="תיאור" />
                <input className={styles.input} type="number" value={editForm.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="סכום" />
                <input className={styles.input} type="date"   value={editForm.date}   onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
                <select className={styles.input} value={editForm.user} onChange={e=>setForm(f=>({...f,user:e.target.value}))}>
                  {USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <div className={styles.editActions}>
                  <button className={styles.saveBtn}   onClick={saveEdit}>שמור</button>
                  <button className={styles.cancelBtn} onClick={()=>setEditId(null)}>ביטול</button>
                </div>
              </div>
            )
          }
          return (
            <div key={t.id} className={styles.row}>
              <span className={styles.icon}>{c?.icon || '📦'}</span>
              <div className={styles.info}>
                <div className={styles.descRow}>
                  <span className={styles.desc}>{t.desc}</span>
                  {u && u.id !== 'family' && (
                    <span className={styles.userBadge} style={{ background: u.color + '22', color: u.color }}>{u.avatar}</span>
                  )}
                </div>
                <span className={styles.meta}>{t.date} · {c?.label}</span>
              </div>
              <span className={`${styles.amt} ${t.type==='income' ? styles.inc : styles.exp}`}>
                {t.type==='income' ? '+' : '-'}{fmt(t.amount)}
              </span>
              <div className={styles.actions}>
                <button className={styles.editBtn}   onClick={() => startEdit(t)}>✏️</button>
                <button className={styles.deleteBtn} onClick={() => { if (confirm('למחוק?')) onDelete(t.id) }}>🗑️</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
