import { useState } from 'react'
import styles from './Onboarding.module.css'

const SLIDES = [
  {
    icon: '🏠',
    title: 'ברוך הבא לכלכלת בית',
    subtitle: 'ניהול חכם של תקציב המשפחה',
    body: 'עקוב אחר הוצאות והכנסות, תכנן תקציב חודשי וקבל תמונה ברורה של המצב הפיננסי שלך — הכל במקום אחד.',
    bg: 'linear-gradient(150deg, #08180e 0%, #0d2b1a 55%, #102e1c 100%)',
    accent: '#4ade80',
    chips: [],
  },
  {
    icon: '↕',
    title: 'עסקאות חכמות',
    subtitle: 'הוסף, ערוך וסנן הכל בקלות',
    body: 'הוסף הוצאה או הכנסה בשניות. הגדר עסקאות חוזרות (שכ"ד, ביטוח, תשלומים) — הן יופיעו אוטומטית בכל חודש.',
    bg: 'linear-gradient(150deg, #0c1a2e 0%, #0f2540 55%, #132d4e 100%)',
    accent: '#60a5fa',
    chips: [{ icon: '🔁', label: 'חזרה חודשית' }, { icon: '📅', label: 'תצוגת לוח שנה' }],
  },
  {
    icon: '🎯',
    title: 'תקציב וחיסכון',
    subtitle: 'שלוט בכסף לפני שהוא שולט בך',
    body: 'הגדר תקציב לכל קטגוריה, עקוב אחר קצב ההוצאות בזמן אמת, וצור יעדי חיסכון עם מעקב התקדמות.',
    bg: 'linear-gradient(150deg, #1a0d2e 0%, #271340 55%, #2d1648 100%)',
    accent: '#c084fc',
    chips: [{ icon: '◎', label: 'תקציב חכם' }, { icon: '🎯', label: 'יעדי חיסכון' }],
  },
  {
    icon: '🏦',
    title: 'שווי נטו ובנקים',
    subtitle: 'התמונה הפיננסית המלאה',
    body: 'עקוב אחר כל הנכסים והחובות — דירה, פנסיה, משכנתא — וסנכרן עסקאות ישירות מהבנק.',
    bg: 'linear-gradient(150deg, #1a1200 0%, #2a1e00 55%, #301f00 100%)',
    accent: '#fbbf24',
    chips: [{ icon: '📊', label: 'שווי נטו' }, { icon: '🔗', label: 'סנכרון בנק' }],
  },
]

const LS_KEY = 'onboarding_v1'

export function shouldShowOnboarding() {
  return !localStorage.getItem(LS_KEY)
}

export default function Onboarding({ onDone }) {
  const [idx, setIdx]         = useState(0)
  const [touchX, setTouchX]   = useState(null)
  const [exiting, setExiting] = useState(false)

  const isLast = idx === SLIDES.length - 1
  const s = SLIDES[idx]

  function go(next) {
    if (next < 0 || next >= SLIDES.length) return
    setIdx(next)
  }

  function finish() {
    setExiting(true)
    setTimeout(() => {
      localStorage.setItem(LS_KEY, '1')
      onDone()
    }, 280)
  }

  function next() { isLast ? finish() : go(idx + 1) }

  function onTouchStart(e) { setTouchX(e.touches[0].clientX) }
  function onTouchEnd(e) {
    if (touchX === null) return
    const diff = touchX - e.changedTouches[0].clientX
    if (diff > 48)  go(idx + 1)
    if (diff < -48) go(idx - 1)
    setTouchX(null)
  }

  return (
    <div
      className={`${styles.wrap} ${exiting ? styles.exit : ''}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.slide} style={{ background: s.bg }}>

        {/* Decorative circle */}
        <div className={styles.glow} style={{ background: s.accent + '22' }} />

        {/* Skip */}
        {!isLast && (
          <button className={styles.skip} onClick={finish}>דלג</button>
        )}

        {/* Icon */}
        <div className={styles.iconWrap}>
          <div className={styles.iconCircle} style={{ boxShadow: `0 0 60px ${s.accent}44` }}>
            <span className={styles.iconEmoji}>{s.icon}</span>
          </div>
        </div>

        {/* Text */}
        <div className={styles.textBlock}>
          <h1 className={styles.title}>{s.title}</h1>
          <p className={styles.subtitle} style={{ color: s.accent }}>{s.subtitle}</p>
          <p className={styles.body}>{s.body}</p>
        </div>

        {/* Feature chips */}
        {s.chips.length > 0 && (
          <div className={styles.chips}>
            {s.chips.map(c => (
              <div key={c.label} className={styles.chip}>
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom: dots + CTA */}
        <div className={styles.bottom}>
          <div className={styles.dots}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`}
                style={i === idx ? { background: s.accent } : {}}
                onClick={() => go(i)}
              />
            ))}
          </div>

          <button
            className={styles.cta}
            style={{ background: s.accent }}
            onClick={next}
          >
            {isLast ? '🚀  בואו נתחיל!' : 'הבא  ›'}
          </button>
        </div>
      </div>
    </div>
  )
}
