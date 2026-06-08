import { useState } from 'react'
import styles from './Savings.module.css'

const fmt = n => '₪' + Number(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })

const PRESET_ICONS = ['🏠', '🚗', '✈️', '🎓', '💍', '🛡️', '🍼', '💻', '🏖️', '🎯', '💰', '🌍']
const PRESET_COLORS = [
  '#1E88E5', '#43A047', '#FB8C00', '#E53935',
  '#8E24AA', '#00ACC1', '#F4511E', '#3949AB',
  '#1B5E20', '#880E4F', '#0D47A1', '#E65100',
]

function daysLeft(targetDate) {
  if (!targetDate) return null
  const diff = new Date(targetDate) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function GoalModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name:          initial?.name          ?? '',
    icon:          initial?.icon          ?? '🎯',
    targetAmount:  initial?.targetAmount  ?? '',
    currentAmount: initial?.currentAmount ?? '',
    targetDate:    initial?.targetDate    ?? '',
    color:         initial?.color         ?? '#1E88E5',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function submit(e) {
    e.preventDefault()
    if (!form.name || !form.targetAmount) return
    onSave({
      ...form,
      targetAmount:  parseFloat(form.targetAmount)  || 0,
      currentAmount: parseFloat(form.currentAmount) || 0,
    })
  }

  return (
    <div className={styles.modalBg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{initial ? 'עריכת יעד' : 'יעד חיסכון חדש'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className={styles.form}>
          {/* Icon row */}
          <label className={styles.label}>אייקון</label>
          <div className={styles.iconGrid}>
            {PRESET_ICONS.map(ic => (
              <button key={ic} type="button"
                className={`${styles.iconBtn} ${form.icon === ic ? styles.iconActive : ''}`}
                onClick={() => set('icon', ic)}>
                {ic}
              </button>
            ))}
          </div>

          {/* Name */}
          <label className={styles.label}>שם היעד</label>
          <input className={styles.input} placeholder="לדוגמה: דירה, רכב, חופשה..."
            value={form.name} onChange={e => set('name', e.target.value)} required />

          {/* Amounts */}
          <div className={styles.row2}>
            <div className={styles.col}>
              <label className={styles.label}>יעד (₪)</label>
              <input className={styles.input} type="number" min="1" placeholder="0"
                value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)} required />
            </div>
            <div className={styles.col}>
              <label className={styles.label}>נחסך כבר (₪)</label>
              <input className={styles.input} type="number" min="0" placeholder="0"
                value={form.currentAmount} onChange={e => set('currentAmount', e.target.value)} />
            </div>
          </div>

          {/* Date */}
          <label className={styles.label}>תאריך יעד (אופציונלי)</label>
          <input className={styles.input} type="date"
            value={form.targetDate} onChange={e => set('targetDate', e.target.value)} />

          {/* Color */}
          <label className={styles.label}>צבע</label>
          <div className={styles.colorGrid}>
            {PRESET_COLORS.map(c => (
              <button key={c} type="button"
                className={`${styles.colorDot} ${form.color === c ? styles.colorActive : ''}`}
                style={{ background: c }}
                onClick={() => set('color', c)} />
            ))}
          </div>

          <button type="submit" className={styles.saveBtn}>שמור</button>
        </form>
      </div>
    </div>
  )
}

function DepositModal({ goal, onDeposit, onClose }) {
  const [amount, setAmount] = useState('')

  function submit(e) {
    e.preventDefault()
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    onDeposit(goal.id, n)
    onClose()
  }

  const remaining = goal.targetAmount - goal.currentAmount

  return (
    <div className={styles.modalBg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{goal.icon} הוספה ל{goal.name}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className={styles.form}>
          <p className={styles.depositSub}>נשאר לצבור: {fmt(remaining)}</p>
          <label className={styles.label}>סכום להפקדה (₪)</label>
          <input className={styles.input} type="number" min="1"
            max={remaining} placeholder="0"
            value={amount} onChange={e => setAmount(e.target.value)}
            autoFocus required />
          <button type="submit" className={styles.saveBtn}>הפקד</button>
        </form>
      </div>
    </div>
  )
}

export default function Savings({ goals, loading, onAdd, onUpdate, onDeposit, onDelete }) {
  const [addOpen,     setAddOpen]     = useState(false)
  const [editGoal,    setEditGoal]    = useState(null)
  const [depositGoal, setDepositGoal] = useState(null)

  const totalTarget  = goals.reduce((a, g) => a + g.targetAmount,  0)
  const totalCurrent = goals.reduce((a, g) => a + g.currentAmount, 0)
  const overallPct   = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0

  if (loading) {
    return <div className={styles.loading}>טוען...</div>
  }

  return (
    <div className={styles.wrap}>
      {/* Summary hero */}
      {goals.length > 0 && (
        <div className={styles.hero}>
          <div className={styles.heroRow}>
            <span className={styles.heroLabel}>סך יעדים</span>
            <span className={styles.heroLabel}>נחסך</span>
          </div>
          <div className={styles.heroRow}>
            <span className={styles.heroAmt}>{fmt(totalTarget)}</span>
            <span className={styles.heroAmt}>{fmt(totalCurrent)}</span>
          </div>
          <div className={styles.heroBarWrap}>
            <div className={styles.heroBar} style={{ width: `${overallPct}%` }} />
          </div>
          <p className={styles.heroPct}>{overallPct}% מסך היעדים הושג</p>
        </div>
      )}

      {/* Header */}
      <div className={styles.listHeader}>
        <h2 className={styles.title}>יעדי חיסכון</h2>
        <button className={styles.addBtn} onClick={() => setAddOpen(true)}>+ הוסף יעד</button>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🎯</span>
          <p className={styles.emptyTitle}>אין יעדי חיסכון עדיין</p>
          <p className={styles.emptySub}>הגדר יעד ראשון — דירה, רכב, חופשה...</p>
          <button className={styles.emptyBtn} onClick={() => setAddOpen(true)}>הוסף יעד ראשון</button>
        </div>
      )}

      {/* Goals list */}
      <div className={styles.list}>
        {goals.map(g => {
          const pct     = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0
          const done    = pct >= 100
          const days    = daysLeft(g.targetDate)
          const barColor = done ? '#43A047' : pct > 70 ? g.color : pct > 30 ? g.color : g.color

          return (
            <div key={g.id} className={`${styles.card} ${done ? styles.cardDone : ''}`}>
              <div className={styles.cardTop}>
                <span className={styles.goalIcon}>{g.icon}</span>
                <div className={styles.goalInfo}>
                  <span className={styles.goalName}>{g.name}</span>
                  {done && <span className={styles.doneBadge}>הושג ✓</span>}
                  {!done && g.targetDate && (
                    <span className={`${styles.dateBadge} ${days < 0 ? styles.dateLate : days < 30 ? styles.dateSoon : ''}`}>
                      {days < 0 ? `עבר ${Math.abs(days)} ימים` : days === 0 ? 'היום!' : `${days} ימים`}
                    </span>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.actBtn} onClick={() => setEditGoal(g)} title="ערוך">✎</button>
                  <button className={styles.actBtn} onClick={() => onDelete(g.id)} title="מחק">✕</button>
                </div>
              </div>

              {/* Progress bar */}
              <div className={styles.barWrap}>
                <div className={styles.bar} style={{ width: `${pct}%`, background: barColor }} />
              </div>

              <div className={styles.cardBottom}>
                <div className={styles.amtGroup}>
                  <span className={styles.amtCurrent} style={{ color: g.color }}>{fmt(g.currentAmount)}</span>
                  <span className={styles.amtSep}>מתוך</span>
                  <span className={styles.amtTarget}>{fmt(g.targetAmount)}</span>
                </div>
                <div className={styles.rightGroup}>
                  <span className={styles.pctLabel}>{pct}%</span>
                  {!done && (
                    <button className={styles.depositBtn}
                      style={{ background: g.color }}
                      onClick={() => setDepositGoal(g)}>
                      + הפקד
                    </button>
                  )}
                </div>
              </div>

              {!done && (
                <p className={styles.remaining}>נשאר לצבור: {fmt(g.targetAmount - g.currentAmount)}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Modals */}
      {addOpen && (
        <GoalModal
          onSave={g => { onAdd(g); setAddOpen(false) }}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editGoal && (
        <GoalModal
          initial={editGoal}
          onSave={g => { onUpdate(editGoal.id, g); setEditGoal(null) }}
          onClose={() => setEditGoal(null)}
        />
      )}
      {depositGoal && (
        <DepositModal
          goal={depositGoal}
          onDeposit={onDeposit}
          onClose={() => setDepositGoal(null)}
        />
      )}
    </div>
  )
}
