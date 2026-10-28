import { callSheet } from './api.js'

const KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

/** מה מצב ההתראות במכשיר הזה. */
export function pushSupport() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // באייפון זה זמין רק כשהאפליקציה פתוחה ממסך הבית
    return isIOS() && !isStandalone() ? 'needs-home-screen' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  return 'ok'
}

function keyBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

// navigator.serviceWorker.ready לא מסתיים אם אין service worker פעיל (למשל בפתיחה ראשונה ממסך הבית),
// לכן לא מחכים לו בלי הגבלה.
async function registration() {
  let reg = await navigator.serviceWorker.getRegistration()
  if (!reg) reg = await navigator.serviceWorker.register('/sw.js')
  if (!reg.active) await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 5000))])
  return reg
}

export async function currentSubscription() {
  if (pushSupport() !== 'ok') return null
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

export async function enablePush() {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('לא אושרה קבלת התראות. אפשר לאשר בהגדרות הטלפון ← התראות ← כלכלת בית')
  const reg = await registration()
  if (!reg.active && !reg.waiting && !reg.installing) throw new Error('האפליקציה עוד נטענת. סגור ופתח אותה שוב ונסה')
  const sub = (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }))
  return callSheet('pushSubscribe', { sub: sub.toJSON() })
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return null
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  return callSheet('pushUnsubscribe', { endpoint })
}
