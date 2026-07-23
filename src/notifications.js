import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { supabase } from './lib/supabase.js'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

let messaging = null

function getMessagingInstance() {
  if (messaging) return messaging
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  messaging = getMessaging(app)
  return messaging
}

export async function requestNotificationPermission(userId) {
  if (!('Notification' in window)) return null
  if (!VAPID_KEY) {
    console.warn('VITE_FIREBASE_VAPID_KEY not set — push notifications disabled')
    return null
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  try {
    const msg = getMessagingInstance()
    await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const swReg = await navigator.serviceWorker.ready

    const token = await getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg })
    if (!token) return null

    if (userId) {
      await saveFcmToken(token, userId)
    }
    return token
  } catch (err) {
    console.error('FCM token error:', err)
    return null
  }
}

async function saveFcmToken(token, userId) {
  const { error } = await supabase
    .from('fcm_tokens')
    .upsert({ user_id: userId, token, updated_at: new Date().toISOString() }, { onConflict: 'token' })
  if (error) console.error('FCM token save error:', error)
}

export function listenToForegroundMessages(onNotification) {
  if (!VAPID_KEY) return () => {}
  try {
    const msg = getMessagingInstance()
    return onMessage(msg, payload => {
      onNotification({
        title: payload.notification?.title || 'כלכלת בית',
        body:  payload.notification?.body  || '',
        data:  payload.data || {},
      })
    })
  } catch {
    return () => {}
  }
}
