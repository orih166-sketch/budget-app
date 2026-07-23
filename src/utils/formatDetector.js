const FORMATS = {
  cal: {
    name: 'כאל',
    detect: headers => headers.some(h => h.includes('כאל') || h.includes('CAL')),
    mapping: { date: 'תאריך עסקה', merchant: 'שם בית עסק', amount: 'סכום חיוב' },
  },
  max: {
    name: 'מקס',
    detect: headers => headers.some(h => h.includes('מקס') || h.includes('MAX')),
    mapping: { date: 'תאריך', merchant: 'בית עסק', amount: 'סכום' },
  },
  isracard: {
    name: 'ישראכרט',
    detect: headers => headers.some(h => h.includes('ישראכרט')),
    mapping: { date: 'תאריך רכישה', merchant: 'שם בית העסק', amount: 'סכום עסקה' },
  },
  discount: {
    name: 'דיסקונט',
    detect: headers => headers.some(h => h.includes('דיסקונט') || h.includes('DISCOUNT')),
    mapping: { date: 'תאריך', merchant: 'פרטי העסקה', amount: 'זכות/חובה' },
  },
}

export function detectFormat(headers) {
  for (const [key, format] of Object.entries(FORMATS)) {
    if (format.detect(headers)) return { key, ...format }
  }
  return null
}

export function parseWithFormat(rows, format) {
  if (!rows.length || !format) return []
  const headerRow = rows.find(r => r.some(c => c && c.length > 0)) || rows[0]
  const headers = headerRow.map(h => String(h || '').trim())
  const { mapping } = format

  const dateIdx = headers.findIndex(h => h.includes(mapping.date) || h === mapping.date)
  const merchantIdx = headers.findIndex(h => h.includes(mapping.merchant) || h === mapping.merchant)
  const amountIdx = headers.findIndex(h => h.includes(mapping.amount) || h === mapping.amount)

  if (dateIdx < 0 || amountIdx < 0) return []

  const startIdx = rows.indexOf(headerRow) + 1
  const txns = []

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < 2) continue

    const dateStr = String(row[dateIdx] || '').trim()
    const merchant = merchantIdx >= 0 ? String(row[merchantIdx] || '').trim() : ''
    const amountRaw = String(row[amountIdx] || '').replace(/,/g, '').replace(/\s/g, '')
    const amount = parseFloat(amountRaw)

    if (!dateStr || isNaN(amount) || amount === 0) continue

    txns.push({
      date: dateStr,
      merchant: merchant || 'עסקה',
      amount: Math.abs(amount),
      type: amount < 0 ? 'expense' : 'income',
    })
  }

  return txns
}

export { FORMATS }
