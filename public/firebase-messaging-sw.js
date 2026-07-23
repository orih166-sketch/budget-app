importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Config injected at build time via a fetch, or hardcoded here for the SW context
// (SW cannot access import.meta.env — values must be literal)
firebase.initializeApp({
  apiKey:            'AIzaSyB7dPe0ovqcisfIIhpQkiVJvBEHeLCcwoU',
  authDomain:        'budget-app-2c32f.firebaseapp.com',
  projectId:         'budget-app-2c32f',
  storageBucket:     'budget-app-2c32f.firebasestorage.app',
  messagingSenderId: '25291222635',
  appId:             '1:25291222635:web:7fe968c81b17c7f4edcb2e',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'כלכלת בית'
  const body  = payload.notification?.body  || ''
  const icon  = '/icon.svg'

  self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    dir: 'rtl',
    lang: 'he',
    data: payload.data || {},
  })
})
