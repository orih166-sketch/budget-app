export function generateTxHash(tx) {
  const date = tx.date instanceof Date ? tx.date : new Date(tx.date)
  const dateStr = date.toISOString().split('T')[0]
  const merchantClean = String(tx.merchant || tx.desc || tx.description || '')
    .trim()
    .slice(0, 8)
    .toLowerCase()
  const amount = Math.abs(Number(tx.amount)).toFixed(0)
  return `${dateStr}_${amount}_${merchantClean}`
}

export function isDuplicate(existingHashes, tx) {
  const hash = generateTxHash(tx)
  return existingHashes.has(hash)
}
