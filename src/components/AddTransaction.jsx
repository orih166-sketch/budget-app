import { useState } from 'react'
import { CATEGORIES, USERS } from '../data.js'
import styles from './AddTransaction.module.css'

const REPEAT_OPTS = [
  { value: 'none',    label: 'חד-פעמי', icon: '1' },
  { value: 'weekly',  label: 'שבועי',   icon: '7' },
  { value: 'monthly', label: 'חודשי',   icon: '🔁' },
  { value: 'yearly',  label: 'שנתי',    icon: '📆' },
]

// Fix #3: Local-timezone safe date — no more midnight UTC bugs
const today = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

// Fix #4: Non-family users from data.js — no hardcoded options
const USER_OPTIONS = USERS.filter(u => u.id !== 'family')

export default function AddTransaction({ onAdd, onAddRecurring, onClose, user, users = USER_OPTIONS }) {
  const [type, setType]     = useState('expense')
  const [repeat, setRepeat] = useState('none')
  const [form, setForm]     = useState({
    desc:     '',
    amount:   '',
    category: '',
    date:     today(),
    user:     user?.id || users[0]?.id || 'uri',
  })

  const cats = CATEGORIES[type === 'expense' ? 'expenses' : 'income']

  function handleTypeChange(t) {
    setType(t)
    setForm(f => ({ ...f, category: '' })) // reset category on type switch
  }

  function submit(e) {
    e.preventDefault()
    if (!form.amount || !form.category) return
    const amount = parseFloat(form.amount)

    if (repeat !== 'none' && onAddRecurring) {
      const startDate = form.date
      onAddRecurring({
        desc:       form.desc || '',
        amount,
        type,
        category:   form.category,
        user:       form.user,
        interval:   repeat,
        startDate,
        endDate:    null,
        dayOfMonth: new Date(startDate + 'T00:00:00').getDate(),
      })
    } else {
      onAdd({ ...form, amount, type })
    }
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <h2 className={styles.title}>הוסף עסקה</h2>

        {/* Expense / Income toggle */}
        <div className={styles.typeToggle}>
          <button type="button"
            className={`${styles.typeBtn} ${type === 'expense' ? styles.expense : ''}`}
            onClick={() => handleTypeChange('expense')}>הוצאה</button>
          <button type="button"
            className={`${styles.typeBtn} ${type === 'income' ? styles.income : ''}`}
            onClick={() => handleTypeChange('income')}>הכנסה</button>
        </div>

        <form onSubmit={submit} className={styles.form}>

          {/* Fix #1: Amount FIRST — opens numeric keypad on mobile */}
          <label className={styles.label}>סכום (₪)
            <input
              className={`${styles.input} ${styles.amountInput}`}
              type="number"
              inputMode="decimal"
              pattern="[0-9]*"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              autoFocus
              required
            />
          </label>

          {/* Description */}
          <label className={styles.label}>תיאור
            <input
              className={styles.input}
              value={form.desc}
              onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
              placeholder="לדוגמה: רמי לוי"
            />
          </label>

          {/* Fix #2: Category grid — tap to select, no dropdown */}
          <div className={styles.labelBlock}>
            <span className={styles.labelText}>
              קטגוריה
              {!form.category && <span className={styles.required}> *</span>}
            </span>
            <div className={styles.catGrid}>
              {cats.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.catChip} ${form.category === c.id ? styles.catChipActive : ''}`}
                  style={form.category === c.id ? { background: c.color, borderColor: c.color } : {}}
                  onClick={() => setForm(f => ({ ...f, category: c.id }))}
                >
                  <span className={styles.catIcon}>{c.icon}</span>
                  <span className={styles.catLabel}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <label className={styles.label}>תאריך
            <input
              className={styles.input}
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </label>

          {/* Fix #4: Dynamic users — driven by props/config, not hardcoded */}
          <div className={styles.labelBlock}>
            <span className={styles.labelText}>משתמש</span>
            <div className={styles.userToggle}>
              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  className={`${styles.userBtn} ${form.user === u.id ? styles.userBtnActive : ''}`}
                  style={form.user === u.id ? { background: u.color, borderColor: u.color } : {}}
                  onClick={() => setForm(f => ({ ...f, user: u.id }))}
                >
                  <span
                    className={styles.userAvatar}
                    style={{ background: form.user === u.id ? 'rgba(255,255,255,.25)' : u.color }}
                  >{u.avatar}</span>
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          {/* Repeat */}
          <div className={styles.labelBlock}>
            <span className={styles.labelText}>חזרה</span>
            <div className={styles.repeatGrid}>
              {REPEAT_OPTS.map(opt => (
                <button key={opt.value} type="button"
                  className={`${styles.repeatBtn} ${repeat === opt.value ? styles.repeatBtnActive : ''}`}
                  onClick={() => setRepeat(opt.value)}
                >
                  <span className={styles.repeatIcon}>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={onClose}>ביטול</button>
            <button
              type="submit"
              className={`${styles.submit} ${type === 'income' ? styles.submitGreen : ''}`}
              disabled={!form.category}
            >הוסף ✓</button>
          </div>

        </form>
      </div>
    </div>
  )
}
