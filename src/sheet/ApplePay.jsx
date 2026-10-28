import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useSheet } from './api.js'
import s from './sheet.module.css'

export default function ApplePay({ back }) {
  const link = useSheet('applePayLink', {})
  const [copied, setCopied] = useState(false)
  const url = link.data?.url

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true) } catch { setCopied(false) }
  }

  return (
    <div className={s.screen}>
      <div className={s.topbar}>
        <div className={s.row}>
          <button type="button" className={s.iconBtn} aria-label="חזרה" onClick={back}><ChevronRight size={18} aria-hidden="true" /></button>
          <h1 className={s.h1}>רישום אוטומטי מ-Apple Pay</h1>
        </div>
      </div>

      <p className={s.muted} style={{ lineHeight: 1.6 }}>
        אחרי כל תשלום ב-Apple Pay, האייפון ישלח את הסכום ואת שם בית העסק, וההוצאה תירשם ביומן לבד, בקטגוריה לפי זיכרון בתי העסק.
        מגדירים פעם אחת בכל טלפון. זה עובד רק בתשלום עם הטלפון או השעון, לא עם כרטיס פיזי.
      </p>

      <span className={s.sectionLabel}>1. הקישור האישי שלך</span>
      <div className={s.card} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className={s.code}>{url || 'טוען…'}</span>
        <button type="button" className={s.primary} disabled={!url} onClick={copy}>{copied ? 'הועתק' : 'העתקת הקישור'}</button>
        <span className={s.small}>הקישור אישי. לא לשלוח אותו לאף אחד: מי שיש לו אותו יכול לרשום הוצאות ביומן.</span>
      </div>

      <span className={s.sectionLabel}>2. יצירת האוטומציה באייפון</span>
      <div className={s.card} style={{ padding: 16 }}>
        <ol className={s.steps}>
          <li>פותחים את האפליקציה <b>קיצורים</b>, ועוברים ללשונית <b>אוטומציה</b>.</li>
          <li>לוחצים <b>+</b> (או "אוטומציה חדשה") ובוחרים <b>ארנק</b>.</li>
          <li>מסמנים את הכרטיסים (כאל / מקס), ובוחרים <b>הפעלה מיידית</b>. לוחצים "הבא".</li>
          <li>בוחרים <b>אוטומציה ריקה חדשה</b>, ומוסיפים פעולה: <b>קבלת תוכן של URL</b>.</li>
          <li>במקום הכתובת מדביקים את הקישור מסעיף 1.</li>
          <li>לוחצים על החץ ליד הפעולה: שיטה <b>POST</b>, גוף הבקשה <b>JSON</b>.</li>
          <li>מוסיפים שלושה שדות טקסט:
            <b> amount</b> = "סכום" (מקלט הקיצור),
            <b> merchant</b> = "סוחר",
            <b> card</b> = "כרטיס".</li>
          <li>לוחצים "סיום". מעכשיו כל תשלום נרשם לבד, ותקבל התראה עם הקטגוריה.</li>
        </ol>
      </div>
      <p className={s.small}>כשתייבא אחר כך את הדוח של הכרטיס, תנועות שכבר נרשמו מ-Apple Pay יסומנו ככפולות ולא ייובאו שוב.</p>
    </div>
  )
}
