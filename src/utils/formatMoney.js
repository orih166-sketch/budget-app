export function formatMoney(amount, { showSign = false } = {}) {
  const n = Number(amount)
  const abs = Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })
  if (showSign) {
    const sign = n < 0 ? '-' : '+'
    return `${sign}₪${abs}`
  }
  return `₪${abs}`
}

export function moneyColor(amount) {
  return amount < 0 ? 'var(--red)' : 'var(--green)'
}
