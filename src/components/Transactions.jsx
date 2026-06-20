import { useState, useMemo } from 'react'
import { CATEGORIES, MONTHS, USERS } from '../data.js'
import { INTERVAL_LABELS } from '../hooks/useRecurring.js'
import styles from './Transactions.module.css'
import calStyles from './Calendar.module.css'

const DOW_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

const fmt = n => '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })
const allCats = [...CATEGORIES.expenses, ...CATEGORIES.income]
const cat = id => allCats.find(c => c.id === id)
const userInfo = id => USERS.find(u => u.id === id)

function formatDateLabel(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'היום'
  if (d.toDateString() === yesterday.toDateString()) return 'אתמול'
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
}

function groupByDate(txs) {
  const groups = {}
  txs.forEach(t => {
    if (!groups[t.date]) groups[t.date] = []
    groups[t.date].push(t)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function exportToCSV(transactions) {
  const headers = ['תאריך', 'תיאור', 'קטגוריה', 'סכום', 'סוג']
  const rows = transactions.map(t => [
    t.date, t.desc,
    cat(t.category)?.label || t.category,
    t.amount,
    t.type === 'income' ? 'הכנסה' : 'הוצאה'
  ])
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

export default function Transactions({ transactions, onDelete, onUpdate, selectedMonth, selectedYear, onMonthChange, selectedUser = 'family', recurring }) {
  const [search, setSearch]         = useState('')
  const [filterType, setType]       = useState('')
  const [filterCat, setCat]         = useState('')
  const [editId, setEditId]         = useState(null)
  const [editForm, setForm]         = useState({})
  const [deleteId, setDeleteId]     = useState(null)
  const [showFilters, setFilters]   = useState(false)
  const [showRecurring, setShowRec] = useState(false)
  const [view, setView]             = useState('list')
  const [calDay, setCalDay]         = useState(null)

  // Merge real transactions + recurring instances for this month
  const allTxns = useMemo(() => {
    const instances = recurring?.instancesForMonth(selectedYear, selectedMonth) ?? []
    return [...transactions, ...instances]
  }, [transactions, selectedMonth, selectedYear, recurring?.rules])  // eslint-disable-line

  const filtered = useMemo(() => {
    return allTxns.filter(t => {
      const d = new Date(t.date)
      if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) return false
      if (selectedUser !== 'family' && t.user !== selectedUser) return false
      if (filterType && t.type !== filterType) return false
      if (filterCat  && t.category !== filterCat) return false
      if (search && !t.desc.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, selectedMonth, selectedYear, selectedUser, filterType, filterCat, search])

  const totalIncome   = filtered.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  const balance       = totalIncome - totalExpenses
  const grouped       = useMemo(() => groupByDate(filtered), [filtered])

  function startEdit(t) {
    setEditId(t.id)
    setForm({ desc: t.desc, amount: t.amount, category: t.category, date: t.date, user: t.user })
  }
  function saveEdit() {
    const amount = parseFloat(editForm.amount)
    if (!amount || isNaN(amount) || amount <= 0) return
    onUpdate(editId, { ...editForm, amount })
    setEditId(null)
  }

  const hasActiveFilter = filterType || filterCat || search

  return (
    <div className={styles.wrap}>

      {/* ── Search + controls ── */}
      <div className={styles.topBar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            className={styles.search}
            placeholder="חיפוש עסקאות..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className={styles.clearSearch} onClick={() => setSearch('')}>✕</button>}
        </div>
        <button
          className={`${styles.filterToggle} ${(showFilters || hasActiveFilter) ? styles.filterToggleActive : ''}`}
          onClick={() => setFilters(v => !v)}
        >
          ⚙
          {hasActiveFilter && <span className={styles.filterDot} />}
        </button>
        <button className={styles.exportBtn} onClick={() => exportToCSV(filtered)} title="ייצוא CSV">
          ↓
        </button>
        <button
          className={`${styles.filterToggle} ${view === 'calendar' ? styles.filterToggleActive : ''}`}
          onClick={() => { setView(v => v === 'calendar' ? 'list' : 'calendar'); setCalDay(null) }}
          title="תצוגת לוח שנה"
        >
          📅
        </button>
        {recurring?.rules?.length > 0 && (
          <button
            className={`${styles.filterToggle} ${showRecurring ? styles.filterToggleActive : ''}`}
            onClick={() => setShowRec(v => !v)}
            title="עסקאות קבועות"
          >
            🔁
          </button>
        )}
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className={styles.filterPanel}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>סוג</span>
            <div className={styles.chips}>
              {[['', 'הכל'], ['expense', 'הוצאות'], ['income', 'הכנסות']].map(([v, l]) => (
                <button key={v} className={`${styles.chip} ${filterType === v ? styles.chipActive : ''}`} onClick={() => setType(v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>חודש</span>
            <div className={styles.chips}>
              <select className={styles.miniSel} value={selectedMonth} onChange={e => onMonthChange(+e.target.value, selectedYear)}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select className={styles.miniSel} value={selectedYear} onChange={e => onMonthChange(selectedMonth, +e.target.value)}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          {(filterType || filterCat) && (
            <button className={styles.clearFilters} onClick={() => { setType(''); setCat('') }}>נקה פילטרים</button>
          )}
        </div>
      )}

      {/* ── Recurring rules panel ── */}
      {showRecurring && recurring?.rules?.length > 0 && (
        <div className={styles.recPanel}>
          <div className={styles.recPanelTitle}>עסקאות קבועות</div>
          {recurring.rules.map(rule => {
            const c = allCats.find(x => x.id === rule.category)
            return (
              <div key={rule.id} className={styles.recRow}>
                <span className={styles.recIcon}>{c?.icon || '📦'}</span>
                <div className={styles.recInfo}>
                  <span className={styles.recDesc}>{rule.desc || c?.label}</span>
                  <span className={styles.recMeta}>{INTERVAL_LABELS[rule.interval]} · {fmt(rule.amount)}</span>
                </div>
                <span className={`${styles.recAmt} ${rule.type === 'income' ? styles.inc : styles.exp}`}>
                  {rule.type === 'income' ? '+' : '-'}{fmt(rule.amount)}
                </span>
                <button className={styles.recDelete} onClick={() => recurring.deleteRule(rule.id)} title="הפסק חזרה">✕</button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Summary strip ── */}
      <div className={styles.summaryStrip}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLbl}>הכנסות</span>
          <span className={`${styles.summaryVal} ${styles.inc}`}>+{fmt(totalIncome)}</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLbl}>הוצאות</span>
          <span className={`${styles.summaryVal} ${styles.exp}`}>-{fmt(totalExpenses)}</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLbl}>מאזן</span>
          <span className={`${styles.summaryVal} ${balance >= 0 ? styles.inc : styles.exp}`}>{fmt(balance)}</span>
        </div>
      </div>

      {/* ── Calendar view ── */}
      {view === 'calendar' && (
        <CalendarView
          transactions={transactions}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          calDay={calDay}
          setCalDay={setCalDay}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}

      {/* ── Transaction list grouped by date ── */}
      {view === 'list' && filtered.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📭</div>
          <p>אין עסקאות לתקופה זו</p>
        </div>
      )}
      {view === 'list' && filtered.length > 0 && (
        <div className={styles.list}>
          {grouped.map(([date, txs]) => (
            <div key={date} className={styles.dateGroup}>
              <div className={styles.dateHeader}>
                <span className={styles.dateLbl}>{formatDateLabel(date)}</span>
                <span className={styles.dateLine} />
                <span className={styles.dateAmt}>
                  {(() => {
                    const net = txs.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0)
                    return <span style={{ color: net >= 0 ? 'var(--c-green)' : 'var(--c-red)' }}>{net >= 0 ? '+' : ''}{fmt(net)}</span>
                  })()}
                </span>
              </div>

              {txs.map(t => {
                const c = cat(t.category)
                const u = userInfo(t.user)

                if (editId === t.id) {
                  return (
                    <div key={t.id} className={styles.editCard}>
                      <input className={styles.editInput} value={editForm.desc}
                        onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="תיאור" />
                      <div className={styles.editRow}>
                        <input className={styles.editInput} type="number" value={editForm.amount}
                          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="סכום" />
                        <input className={styles.editInput} type="date" value={editForm.date}
                          onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                      </div>
                      <select className={styles.editInput} value={editForm.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))}>
                        {USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      <div className={styles.editActions}>
                        <button className={styles.saveBtn} onClick={saveEdit}>שמור</button>
                        <button className={styles.cancelBtn} onClick={() => setEditId(null)}>ביטול</button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={t.id} className={`${styles.row} ${t.type === 'income' ? styles.rowIncome : styles.rowExpense}`}>
                    <div className={styles.iconWrap} style={{ background: c?.color ? c.color + '18' : 'var(--c-bg)' }}>
                      <span className={styles.rowIcon}>{c?.icon || '📦'}</span>
                    </div>
                    <div className={styles.info}>
                      <div className={styles.descRow}>
                        <span className={styles.desc}>{t.desc}</span>
                        {t.isRecurring && <span className={styles.recBadge}>🔁</span>}
                        {u && u.id !== 'family' && (
                          <span className={styles.userBadge} style={{ background: u.color + '22', color: u.color }}>{u.avatar}</span>
                        )}
                      </div>
                      <span className={styles.meta}>{c?.label || t.category}</span>
                    </div>
                    <div className={styles.rowRight}>
                      <span className={`${styles.amt} ${t.type === 'income' ? styles.inc : styles.exp}`}>
                        {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                      </span>
                      <div className={styles.actions}>
                        {t.isRecurring ? (
                          deleteId === t.id ? (
                            <>
                              <button className={styles.deleteConfirmBtn} onClick={() => { recurring.deleteRule(t.recurringId); setDeleteId(null) }}>הפסק</button>
                              <button className={styles.deleteCancelBtn} onClick={() => setDeleteId(null)}>ביטול</button>
                            </>
                          ) : (
                            <button className={`${styles.actionBtn} ${styles.actionBtnDel}`} onClick={() => setDeleteId(t.id)} title="הפסק חזרה">✕</button>
                          )
                        ) : deleteId === t.id ? (
                          <>
                            <button className={styles.deleteConfirmBtn} onClick={() => { onDelete(t.id); setDeleteId(null) }}>מחק</button>
                            <button className={styles.deleteCancelBtn} onClick={() => setDeleteId(null)}>ביטול</button>
                          </>
                        ) : (
                          <>
                            <button className={styles.actionBtn} onClick={() => startEdit(t)}>✏</button>
                            <button className={`${styles.actionBtn} ${styles.actionBtnDel}`} onClick={() => setDeleteId(t.id)}>✕</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Calendar view component ──────────────────────────────────────

function CalendarView({ transactions, selectedMonth, selectedYear, calDay, setCalDay, onUpdate, onDelete }) {
  const fmt = n => '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })

  // Build day map: day number → {income, expense, txns}
  const dayMap = useMemo(() => {
    const map = {}
    transactions.forEach(t => {
      const d = new Date(t.date)
      if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) return
      const day = d.getDate()
      if (!map[day]) map[day] = { income: 0, expense: 0, txns: [] }
      if (t.type === 'income') map[day].income += t.amount
      else map[day].expense += t.amount
      map[day].txns.push(t)
    })
    return map
  }, [transactions, selectedMonth, selectedYear])

  const firstDow   = new Date(selectedYear, selectedMonth, 1).getDay() // 0=Sun
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()

  const dayTxns = calDay && dayMap[calDay]?.txns || []

  return (
    <div className={calStyles.wrap}>
      {/* Day headers */}
      <div className={calStyles.grid}>
        {DOW_HE.map(d => <div key={d} className={calStyles.dayHeader}>{d}</div>)}

        {/* Empty cells before first day */}
        {Array(firstDow).fill(null).map((_, i) => <div key={'e' + i} className={calStyles.empty} />)}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const data = dayMap[day]
          const net  = data ? data.income - data.expense : 0
          const isSelected = calDay === day
          return (
            <div
              key={day}
              className={`${calStyles.day} ${data ? calStyles.hasData : ''} ${isSelected ? calStyles.selected : ''}`}
              onClick={() => data && setCalDay(prev => prev === day ? null : day)}
            >
              <span className={calStyles.dayNum}>{day}</span>
              {data && (
                <span className={`${calStyles.dayAmt} ${net >= 0 ? calStyles.income : calStyles.expense}`}>
                  {net >= 0 ? '+' : ''}{fmt(Math.abs(net))}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected day transaction list */}
      {calDay && (
        <div className={calStyles.dayDetail}>
          <div className={calStyles.detailHeader}>
            {calDay}/{selectedMonth + 1}/{selectedYear}
            <button className={calStyles.detailClose} onClick={() => setCalDay(null)}>✕</button>
          </div>
          {dayTxns.length === 0 && <p className={calStyles.noTxns}>אין עסקאות</p>}
          {dayTxns.map(t => {
            const c = [...CATEGORIES.expenses, ...CATEGORIES.income].find(x => x.id === t.category)
            return (
              <div key={t.id} className={calStyles.txRow}>
                <div className={calStyles.txIcon} style={{ background: c?.color ? c.color + '18' : '#f1f5f9' }}>
                  {c?.icon || '📦'}
                </div>
                <div className={calStyles.txInfo}>
                  <span className={calStyles.txDesc}>{t.desc}</span>
                  <span className={calStyles.txCat}>{c?.label || t.category}</span>
                </div>
                <span className={`${calStyles.txAmt} ${t.type === 'expense' ? calStyles.expense : calStyles.income}`}>
                  {t.type === 'expense' ? '-' : '+'}{fmt(t.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
