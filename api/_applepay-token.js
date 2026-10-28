import crypto from 'node:crypto'

// טוקן אישי לקיצור של Apple Pay: נגזר מהמייל ומהמפתח של השרת, אז לא צריך לשמור אותו בשום מקום.
export const applePayToken = email =>
  crypto.createHmac('sha256', process.env.GAS_KEY || '').update('applepay:' + String(email).toLowerCase()).digest('hex').slice(0, 32)

export function tokenMatches(email, token) {
  const a = Buffer.from(applePayToken(email))
  const b = Buffer.from(String(token || ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
