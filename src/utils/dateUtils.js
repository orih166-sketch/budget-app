export function parseIsraeliDate(dateStr) {
  if (!dateStr) return null
  const [d, m, y] = String(dateStr).trim().split(/[/.\-]/).map(Number)
  if (!d || !m || !y) return null
  const year = y < 100 ? 2000 + y : y
  return new Date(year, m - 1, d)
}

export function formatDate(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function formatMonth(month, year) {
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
  return `${months[month]} ${year}`
}
