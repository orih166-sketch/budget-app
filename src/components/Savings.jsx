import { useState } from 'react'
import styles from './Savings.module.css'

const fmt = n => '₪' + Number(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })

const PRESET_ICONS   = ['🏠','🚗','✈️','🎓','💍','🛡️','🍼','💻','🏖️','🎯','💰','🌍']
const PRESET_COLORS  = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#3b82f6','#ec4899','#14b8a6','#84cc16','#a855f7']

function daysLeft(targetDate) {
  if (!targetDate) return null
  return Math.ceil((new Date(targetDate) - new Date()) / 86400000)
}

function GoalModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name:          initial?.name          ?? '',
    icon:          initial?.icon          ?? '🎯',
    targetAmount:  initial?.targetAmount  ?? '',
    currentAmount: initial?.currentAmount ?? '',
    targetDate:    initial?.targetDate    ?? '',
    color:         initial?.color         ?? '#6366f1',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function submit(e) {
    e.preventDefault()
    if (!form.name || !form.targetAmount) return
    onSave({ ...form, targetAmount: parseFloat(form.targetAmount) || 0, currentAmount: parseFloat(form.currentAmount) || 0 })
  }

  return (
    <div className={styles.modalBg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHandle} />
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{initial ? 'עריכת יעד' : 'יעד חיסכון חדש'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.fieldWrap}>
            <label className={styles.label}>אייקון</label>
            <div className={styles.iconGrid}>
              {PRESET_ICONS.map(ic => (
                <button key={ic} type="button"
                  className={`${styles.iconBtn} ${form.icon === ic ? styles.iconActive : ''}`}
                  style={form.icon === ic ? { borderColor: form.color, background: form.color + '20' } : {}}
                  onClick={() => set('icon', ic)}>{ic}</button>
              ))}
            </div>
          </div>

          <div className={styles.fieldWrap}>
            <label className={styles.label}>שם היעד</label>
            <input className={styles.input} placeholder="לדוגמה: דירה, רכב, חופשה..."
              value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>

          <div className={styles.row2}>
            <div className={styles.fieldWrap} style={{ flex: 1 }}>
              <label className={styles.label}>יעד (₪)</label>
              <input className={styles.input} type="number" min="1" placeholder="0"
                value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)} required />
            </div>
            <div className={styles.fieldWrap} style={{ flex: 1 }}>
              <label className={styles.label}>נחסך כבר (₪)</label>
              <input className={styles.input} type="number" min="0" placeholder="0"
                value={form.currentAmount} onChange={e => set('currentAmount', e.target.value)} />
            </div>
          </div>

          <div className={styles.fieldWrap}>
            <label className={styles.label}>תאריך יעד (אופציונלי)</label>
            <input className={styles.input} type="date"
              value={form.targetDate} onChange={e => set('targetDate', e.target.value)} />
          </div>

          <div className={styles.fieldWrap}>
            <label className={styles.label}>צבע</label>
            <div className={styles.colorGrid}>
              {PRESET_COLORS.map(c => (
                <button key={c} type="button"
                  className={`${styles.colorDot} ${form.color === c ? styles.colorActive : ''}`}
                  style={{ background: c, boxShadow: form.color === c ? `0 0 0 3px ${c}40` : 'none' }}
                  onClick={() => set('color', c)} />
              ))}
            </div>
          </div>

          <button type="submit" className={styles.saveBtn} style={{ background: form.color }}>
            שמור יעד ✓
          </button>
        </form>
      </div>
    </div>
  )
}

function DepositModal({ goal, onDeposit, onClose }) {
  const [amount, setAmount] = useState('')
  const remaining = goal.targetAmount - goal.currentAmount

  function submit(e) {
    e.preventDefault()
    const n = parseFloat(amount)
    if (!n || n <= 0) return
    onDeposit(goal.id, n)
    onClose()
  }

  return (
    <div className={styles.modalBg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHandle} />
        <div className={styles.depositHeader} style={{ background: goal.color + '15', borderColor: goal.color + '30' }}>
          <span className={styles.depositIcon}>{goal.icon}</span>
          <div>
            <div className={styles.depositName}>{goal.name}</div>
            <div className={styles.depositSub}>נשאר לצבור: {fmt(remaining)}</div>
          </div>
        </div>
        <form onSubmit={submit} className={styles.form} style={{ marginTop: 20 }}>
          <div className={styles.fieldWrap}>
            <label className={styles.label}>סכום להפקדה (₪)</label>
            <input className={styles.input} type="number" min="1"
              placeholder="0" value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus required />
          </div>
          <button type="submit" className={styles.saveBtn} style={{ background: goal.color }}>
            הפקד ✓
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Savings({ goals, loading, onAdd, onUpdate, onDeposit, onDelete }) {
  const [addOpen,       setAddOpen]       = useState(false)
  const [editGoal,      setEditGoal]      = useState(null)
  const [depositGoal,   setDepositGoal]   = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const totalTarget  = goals.reduce((a, g) => a + g.targetAmount,  0)
  const totalCurrent = goals.reduce((a, g) => a + g.currentAmount, 0)
  const overallPct   = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>

  return (
    <div className={styles.wrap}>

      {/* ── Hero ── */}
      {goals.length > 0 && (
        <div className={styles.hero}>
          <div className={styles.heroTop}>
            <div>
              <div className={styles.heroGreet}>סך יעדי חיסכון</div>
              <div className={styles.heroBig}>{fmt(totalCurrent)}</div>
              <div className={styles.heroSub}>מתוך {fmt(totalTarget)}</div>
            </div>
            <div className={styles.heroCircle}>
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="6" />
                <circle cx="36" cy="36" r="30" fill="none" stroke="#c9a84c" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 30}`}
                  strokeDashoffset={`${2 * Math.PI * 30 * (1 - overallPct / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 36 36)"
                  style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)' }}
                />
                <text x="36" y="40" textAnchor="middle" fill="#f9eda0" fontSize="14" fontWeight="800">{overallPct}%</text>
              </svg>
            </div>
          </div>
          <div className={styles.heroBarWrap}>
            <div className={styles.heroBar} style={{ width: `${overallPct}%` }} />
          </div>
          <div className={styles.heroFooter}>
            <span>{goals.length} יעדים פעילים</span>
            <span>{fmt(totalTarget - totalCurrent)} נותר לצבור</span>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className={styles.listHeader}>
        <h2 className={styles.title}>יעדי חיסכון</h2>
        <button className={styles.addBtn} onClick={() => setAddOpen(true)}>+ הוסף יעד</button>
      </div>

      {/* ── Empty ── */}
      {goals.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎯</div>
          <p className={styles.emptyTitle}>אין יעדי חיסכון עדיין</p>
          <p className={styles.emptySub}>הגדר יעד ראשון — דירה, רכב, חופשה...</p>
          <button className={styles.emptyBtn} onClick={() => setAddOpen(true)}>הוסף יעד ראשון</button>
        </div>
      )}

      {/* ── Goals ── */}
      <div className={styles.list}>
        {goals.map((g, i) => {
          const pct  = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0
          const done = pct >= 100
          const days = daysLeft(g.targetDate)

          return (
            <div key={g.id} className={`${styles.card} ${done ? styles.cardDone : ''}`}
              style={{ animationDelay: `${i * 0.04}s` }}>

              <div className={styles.cardLeft} style={{ background: g.color }}>
                <span className={styles.goalIcon}>{g.icon}</span>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <div className={styles.goalMeta}>
                    <span className={styles.goalName}>{g.name}</span>
                    <div className={styles.badges}>
                      {done && <span className={styles.doneBadge}>הושג ✓</span>}
                      {!done && g.targetDate && (
                        <span className={`${styles.dateBadge} ${days < 0 ? styles.dateLate : days < 30 ? styles.dateSoon : ''}`}>
                          {days < 0 ? `עבר ${Math.abs(days)} ימים` : days === 0 ? 'היום!' : `${days} ימים`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.actBtn} onClick={() => setEditGoal(g)}>✎</button>
                    <button className={`${styles.actBtn} ${styles.actBtnDel}`} onClick={() => setDeleteConfirm(g.id)}>✕</button>
                  </div>
                </div>

                <div className={styles.amtRow}>
                  <span className={styles.amtCurrent} style={{ color: done ? '#10b981' : g.color }}>{fmt(g.currentAmount)}</span>
                  <span className={styles.amtSep}>/</span>
                  <span className={styles.amtTarget}>{fmt(g.targetAmount)}</span>
                  <span className={styles.pctLabel}>{pct}%</span>
                </div>

                <div className={styles.barWrap}>
                  <div className={styles.bar} style={{ width: `${pct}%`, background: done ? '#10b981' : g.color }} />
                </div>

                {!done && (
                  <div className={styles.cardBottom}>
                    <span className={styles.remaining}>נותר: {fmt(g.targetAmount - g.currentAmount)}</span>
                    <button className={styles.depositBtn} style={{ background: g.color }}
                      onClick={() => setDepositGoal(g)}>+ הפקד</button>
                  </div>
                )}

                {deleteConfirm === g.id && (
                  <div className={styles.deleteConfirm}>
                    <span>למחוק את "{g.name}"?</span>
                    <div className={styles.deleteActions}>
                      <button className={styles.deleteCancelBtn} onClick={() => setDeleteConfirm(null)}>ביטול</button>
                      <button className={styles.deleteOkBtn} onClick={() => { onDelete(g.id); setDeleteConfirm(null) }}>מחק</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {addOpen    && <GoalModal onSave={g => { onAdd(g); setAddOpen(false) }} onClose={() => setAddOpen(false)} />}
      {editGoal   && <GoalModal initial={editGoal} onSave={g => { onUpdate(editGoal.id, g); setEditGoal(null) }} onClose={() => setEditGoal(null)} />}
      {depositGoal && <DepositModal goal={depositGoal} onDeposit={onDeposit} onClose={() => setDepositGoal(null)} />}
    </div>
  )
}
