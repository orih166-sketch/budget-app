export function money(n, { cents = false } = {}) {
  const v = Number(n) || 0
  const abs = Math.abs(v)
  const s = cents && abs % 1
    ? abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(abs).toLocaleString('en-US')
  // סכום שלילי עטוף בכיוון משמאל לימין, אחרת המינוס קופץ לצד השני בטקסט עברי
  return v < 0 ? '⁦-₪' + s + '⁩' : '₪' + s
}

export const ymd = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const parseYmd = s => {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, m - 1, d || 1)
}

export const ddmm = s => {
  const d = parseYmd(s)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
export const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export const monthLabel = ym => {
  const d = parseYmd(ym + '-01')
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export const shiftMonth = (ym, n) => {
  const d = parseYmd(ym + '-01')
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1)
  return ymd(x).slice(0, 7)
}

/** ההודעות מהגיליון כוללות סמלים שנועדו לטלגרם; באפליקציה מציגים טקסט נקי. */
export const cleanMsg = s => String(s || '').replace(/[←→]/g, '·').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, '').replace(/\s+/g, ' ').trim()

export const initial = s => String(s || '?').trim().charAt(0)
