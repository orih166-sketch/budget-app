import { useState } from 'react'
import { useAccounts } from '../hooks/useAccounts.js'
import styles from './Accounts.module.css'

const fmt = n => '₪' + Number(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })

const ASSET_TYPES = [
  { id: 'checking',   label: 'עו"ש',        icon: '🏦' },
  { id: 'savings',    label: 'חיסכון',       icon: '💰' },
  { id: 'investment', label: 'השקעות',       icon: '📈' },
  { id: 'property',   label: 'נדל"ן',        icon: '🏠' },
  { id: 'pension',    label: 'פנסיה/גמל',   icon: '🧓' },
  { id: 'other_asset',label: 'אחר',          icon: '📦' },
]

const LIABILITY_TYPES = [
  { id: 'mortgage',   label: 'משכנתא',       icon: '🏠' },
  { id: 'car_loan',   label: 'הלוואת רכב',  icon: '🚗' },
  { id: 'credit',     label: 'כרטיס אשראי', icon: '💳' },
  { id: 'loan',       label: 'הלוואה',       icon: '🏛' },
  { id: 'other_liab', label: 'אחר',          icon: '📦' },
]

const ALL_SUB = [...ASSET_TYPES, ...LIABILITY_TYPES]
const subInfo = id => ALL_SUB.find(s => s.id === id) ?? { label: id, icon: '📦' }

function AccountModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name:    initial?.name    ?? '',
    type:    initial?.type    ?? 'asset',
    subtype: initial?.subtype ?? 'checking',
    balance: initial?.balance ?? '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function submit(e) {
    e.preventDefault()
    if (!form.name || form.balance === '') return
    onSave({ ...form, balance: parseFloat(form.balance) || 0 })
  }

  const subtypes = form.type === 'asset' ? ASSET_TYPES : LIABILITY_TYPES

  return (
    <div className={styles.modalBg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHandle} />
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{initial ? 'עריכת חשבון' : 'הוסף חשבון'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} className={styles.form}>
          {/* Asset vs Liability */}
          <div className={styles.fieldWrap}>
            <label className={styles.label}>סוג</label>
            <div className={styles.typeRow}>
              <button type="button"
                className={`${styles.typeBtn} ${form.type === 'asset' ? styles.typeBtnActive : ''}`}
                style={form.type === 'asset' ? { borderColor: '#10b981', background: '#f0fdf4', color: '#10b981' } : {}}
                onClick={() => set('type', 'asset')}>
                📈 נכס
              </button>
              <button type="button"
                className={`${styles.typeBtn} ${form.type === 'liability' ? styles.typeBtnActive : ''}`}
                style={form.type === 'liability' ? { borderColor: '#ef4444', background: '#fef2f2', color: '#ef4444' } : {}}
                onClick={() => set('type', 'liability')}>
                📉 חוב
              </button>
            </div>
          </div>

          {/* Subtype */}
          <div className={styles.fieldWrap}>
            <label className={styles.label}>קטגוריה</label>
            <div className={styles.subtypeGrid}>
              {subtypes.map(s => (
                <button key={s.id} type="button"
                  className={`${styles.subtypeBtn} ${form.subtype === s.id ? styles.subtypeBtnActive : ''}`}
                  onClick={() => set('subtype', s.id)}>
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldWrap}>
            <label className={styles.label}>שם החשבון</label>
            <input className={styles.input} placeholder='לדוגמה: "עו"ש בנק דיסקונט"'
              value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>

          <div className={styles.fieldWrap}>
            <label className={styles.label}>{form.type === 'asset' ? 'יתרה (₪)' : 'יתרת חוב (₪)'}</label>
            <input className={styles.input} type="number" min="0" placeholder="0" dir="ltr"
              value={form.balance} onChange={e => set('balance', e.target.value)} required />
          </div>

          <button type="submit" className={styles.saveBtn}
            style={{ background: form.type === 'asset' ? '#10b981' : '#ef4444' }}>
            {initial ? 'עדכן ✓' : 'הוסף חשבון ✓'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Accounts() {
  const { accounts, assets, liabilities, totalAssets, totalLiab, netWorth, addAccount, updateAccount, deleteAccount } = useAccounts()
  const [addOpen,  setAddOpen]  = useState(false)
  const [editAcc,  setEditAcc]  = useState(null)
  const [delId,    setDelId]    = useState(null)

  const positive = netWorth >= 0

  return (
    <div className={styles.wrap}>

      {/* ── Hero: Net Worth ── */}
      <div className={`${styles.hero} ${positive ? styles.heroPos : styles.heroNeg}`}>
        <div className={styles.heroLabel}>שווי נטו (Net Worth)</div>
        <div className={styles.heroAmount}>{fmt(Math.abs(netWorth))}</div>
        {netWorth < 0 && <div className={styles.heroSub}>— חוב נטו</div>}

        <div className={styles.heroSplit}>
          <div className={styles.heroSide}>
            <span className={styles.heroSideLabel}>נכסים</span>
            <span className={styles.heroSideVal} style={{ color: '#4ade80' }}>{fmt(totalAssets)}</span>
          </div>
          <div className={styles.heroDivider} />
          <div className={styles.heroSide}>
            <span className={styles.heroSideLabel}>חובות</span>
            <span className={styles.heroSideVal} style={{ color: '#f87171' }}>{fmt(totalLiab)}</span>
          </div>
        </div>

        {/* Bar: assets vs liabilities */}
        {(totalAssets > 0 || totalLiab > 0) && (() => {
          const total = totalAssets + totalLiab
          const assetPct = total > 0 ? (totalAssets / total) * 100 : 0
          return (
            <div className={styles.splitBar}>
              <div className={styles.splitBarAsset} style={{ width: `${assetPct}%` }} />
            </div>
          )
        })()}
      </div>

      {/* ── Header ── */}
      <div className={styles.listHeader}>
        <h2 className={styles.title}>חשבונות</h2>
        <button className={styles.addBtn} onClick={() => setAddOpen(true)}>+ הוסף</button>
      </div>

      {/* ── Empty ── */}
      {accounts.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🏦</div>
          <p className={styles.emptyTitle}>אין חשבונות עדיין</p>
          <p className={styles.emptySub}>הוסף את הנכסים והחובות שלך כדי לחשב שווי נטו</p>
          <button className={styles.emptyBtn} onClick={() => setAddOpen(true)}>הוסף חשבון ראשון</button>
        </div>
      )}

      {/* ── Assets ── */}
      {assets.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>📈 נכסים</span>
            <span className={styles.sectionTotal} style={{ color: '#10b981' }}>{fmt(totalAssets)}</span>
          </div>
          {assets.map(a => <AccountRow key={a.id} acc={a} onEdit={() => setEditAcc(a)} onDelete={() => setDelId(a.id)} delId={delId} setDelId={setDelId} onConfirmDel={deleteAccount} />)}
        </section>
      )}

      {/* ── Liabilities ── */}
      {liabilities.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>📉 חובות</span>
            <span className={styles.sectionTotal} style={{ color: '#ef4444' }}>{fmt(totalLiab)}</span>
          </div>
          {liabilities.map(a => <AccountRow key={a.id} acc={a} onEdit={() => setEditAcc(a)} onDelete={() => setDelId(a.id)} delId={delId} setDelId={setDelId} onConfirmDel={deleteAccount} />)}
        </section>
      )}

      {addOpen  && <AccountModal onSave={a => { addAccount(a); setAddOpen(false) }} onClose={() => setAddOpen(false)} />}
      {editAcc  && <AccountModal initial={editAcc} onSave={a => { updateAccount(editAcc.id, a); setEditAcc(null) }} onClose={() => setEditAcc(null)} />}
    </div>
  )
}

function AccountRow({ acc, onEdit, onDelete, delId, setDelId, onConfirmDel }) {
  const sub = subInfo(acc.subtype)
  const isAsset = acc.type === 'asset'
  return (
    <div className={styles.card}>
      <div className={styles.cardIcon} style={{ background: isAsset ? '#f0fdf4' : '#fef2f2' }}>
        {sub.icon}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <div className={styles.cardMeta}>
            <span className={styles.cardName}>{acc.name}</span>
            <span className={styles.cardSub}>{sub.label}</span>
          </div>
          <div className={styles.cardRight}>
            <span className={styles.cardBalance} style={{ color: isAsset ? '#10b981' : '#ef4444' }}>
              {isAsset ? '' : '−'}{fmt(acc.balance)}
            </span>
            <div className={styles.cardActions}>
              <button className={styles.actBtn} onClick={onEdit}>✎</button>
              <button className={`${styles.actBtn} ${styles.actBtnDel}`} onClick={onDelete}>✕</button>
            </div>
          </div>
        </div>

        {delId === acc.id && (
          <div className={styles.deleteConfirm}>
            <span>למחוק "{acc.name}"?</span>
            <div className={styles.deleteActions}>
              <button className={styles.deleteCancelBtn} onClick={() => setDelId(null)}>ביטול</button>
              <button className={styles.deleteOkBtn} onClick={() => { onConfirmDel(acc.id); setDelId(null) }}>מחק</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
