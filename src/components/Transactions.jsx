import { useState, useMemo } from 'react'
import { CATEGORIES, MONTHS, USERS } from '../data.js'
import styles from './Transactions.module.css'

const fmt = n => '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })
const allCats = [...CATEGORIES.expenses, ...CATEGORIES.income]
const cat = id => allCats.find(c => c.id === id)
const userInfo = id => USERS.find(u => u.id === id)

function getPeriodDates(period, year) {
  const today = new Date()
  const start = new Date(year, today.getMonth(), today.getDate())

  if (period === 'today') return [start, start]
  if (period === 'week') {
    const weekStart = new Date(start)
    weekStart.setDate(start.getDate() - start.getDay())
    return [weekStart, start]
  }
  if (period === 'month') {
    return [new Date(year, today.getMonth(), 1), start]
  }
  if (period === 'year') {
    return [new Date(year, 0, 1), start]
  }
  return null
}

function exportToCSV(transactions) {
  const headers = ['תאריך', 'תיאור', 'קטגוריה', 'סכום', 'סוג']
  const rows = transactions.map(t => [
    t.date,
    t.desc,
    cat(t.category)?.label || t.category,
    t.amount,
    t.type === 'income' ? 'הכנסה' : 'הוצאה'
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

export default function Transactions({ transactions, onDelete, onUpdate, selectedMonth, selectedYear, onMonthChange, selectedUser = 'family' }) {
  const [search, setSearch]   = useState('')
  const [filterCat, setCat]   = useState('')
  const [filterType, setType] = useState('')
  const [periodFilter, setPeriod] = useState('')
  const [editId,     setEditId]     = useState(null)
  const [editForm,   setForm]       = useState({})
  const [deleteId,   setDeleteId]   = useState(null)

  const filtered = useMemo(() => {
    let result = transactions

    if (periodFilter) {
      const [start, end] = getPeriodDates(periodFilter, selectedYear)
      result = result.filter(t => {
        const d = new Date(t.date)
        return d >= start && d <= end
      })
    } else {
      result = result.filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
      })
    }

    return result.filter(t => {
      if (selectedUser !== 'family' && t.user !== selectedUser) return false
      if (filterType && t.type !== filterType) return false
      if (filterCat  && t.category !== filterCat) return false
      if (search && !t.desc.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }).sort((a,b) => b.date.localeCompare(a.date))
  }, [transactions, selectedMonth, selectedYear, selectedUser, filterType, filterCat, search, periodFilter])

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
        <div className={styles.searchRow}>
          <input className={styles.search} placeholder="חיפוש..." value={search} onChange={e=>setSearch(e.target.value)} />
          <button className={styles.exportBtn} onClick={() => exportToCSV(filtered)} title="הורד CSV">📥</button>
        </div>
        <div className={styles.periodRow}>
          {['today', 'week', 'month', 'year'].map(p => (
            <button
              key={p}
              className={`${styles.periodBtn} ${periodFilter === p ? styles.periodActive : ''}`}
              onClick={() => setPeriod(periodFilter === p ? '' : p)}
            >
              {p === 'today' ? 'היום' : p === 'week' ? 'שבוע' : p === 'month' ? 'חודש' : 'שנה'}
            </button>
          ))}
        </div>
        <div className={styles.filterRow}>
          <select className={styles.sel} value={selectedMonth} onChange={e => { setPeriod(''); onMonthChange(+e.target.value, selectedYear) }}>
            {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select className={styles.sel} value={selectedYear} onChange={e => { setPeriod(''); onMonthChange(selectedMonth, +e.target.value) }}>
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
                {deleteId === t.id ? (
                  <>
                    <button className={styles.deleteConfirmBtn} onClick={() => { onDelete(t.id); setDeleteId(null) }}>מחק</button>
                    <button className={styles.deleteCancelBtn}  onClick={() => setDeleteId(null)}>ביטול</button>
                  </>
                ) : (
                  <>
                    <button className={styles.editBtn}   onClick={() => startEdit(t)} aria-label="ערוך עסקה">✏️</button>
                    <button className={styles.deleteBtn} onClick={() => setDeleteId(t.id)} aria-label="מחק עסקה">🗑️</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
