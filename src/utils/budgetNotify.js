/**
 * budgetNotify.js — בדיקת חריגה מתקציב + שליחת התראה
 *
 * קורא ל-checkBudgetAlert אחרי כל הוצאה חדשה.
 * אם הקטגוריה הגיעה ל-80%/100% מהתקציב:
 *   1. מציג browser push notification
 *   2. מוסיף שורה ל-pending_notifications → הבוט ישלח ב-WhatsApp
 */
import { supabase } from '../lib/supabase.js'
import { CATEGORIES } from '../data.js'

// מפה מ-id קטגוריה → label
const CAT_LABEL = {}
;[...(CATEGORIES.expenses || []), ...(CATEGORIES.income || [])].forEach(c => {
  CAT_LABEL[c.id] = c.label
})

/**
 * @param {object} opts
 * @param {object}  opts.newTx        - העסקה שנוספה { type, category, amount, date }
 * @param {Array}   opts.transactions  - כל העסקאות הקיימות (לפני newTx)
 * @param {object}  opts.budgets       - { [category_id]: budget_amount }
 * @param {string}  opts.householdId   - לתור WhatsApp
 */
export async function checkBudgetAlert({ newTx, transactions, budgets, householdId }) {
  if (newTx.type !== 'expense') return
  if (!newTx.category || !budgets[newTx.category]) return

  const budget = budgets[newTx.category]
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  // סכום הוצאות החודש הנוכחי בקטגוריה זו (כולל העסקה החדשה)
  const monthTotal = transactions
    .filter(t => {
      if (t.type !== 'expense' || t.category !== newTx.category) return false
      const d = new Date(t.date + 'T00:00:00')
      return d.getFullYear() === year && d.getMonth() === month
    })
    .reduce((s, t) => s + t.amount, 0) + newTx.amount

  const pct = Math.round((monthTotal / budget) * 100)
  const catName = CAT_LABEL[newTx.category] || newTx.category

  let title, body
  if (pct >= 100) {
    title = '🔴 חריגה מתקציב!'
    body  = `${catName}: ₪${monthTotal.toFixed(0)} מתוך ₪${budget} (${pct}%)`
  } else if (pct >= 80) {
    title = `⚠️ ${pct}% מהתקציב`
    body  = `${catName}: ₪${monthTotal.toFixed(0)} מתוך ₪${budget}`
  } else {
    return  // לא צריך התראה
  }

  // 1. Push notification בדפדפן (מיידי)
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon:  '/icon.svg',
        badge: '/icon.svg',
        dir:   'rtl',
        lang:  'he',
        tag:   `budget-${newTx.category}`,  // מחליף התראה קודמת לאותה קטגוריה
      })
    } catch (e) {
      console.warn('push notification error:', e)
    }
  }

  // 2. תור WhatsApp → הבוט ישלח
  if (householdId) {
    await supabase
      .from('pending_notifications')
      .insert({
        household_id: householdId,
        type:         'budget_alert',
        message:      `${title}\n${body}`,
      })
      .catch(e => console.warn('pending_notifications insert:', e.message))
  }
}
