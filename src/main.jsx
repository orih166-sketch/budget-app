import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// גרסה חדשה של האפליקציה נטענת לבד: בודקים כשחוזרים לאפליקציה, והדף מתרענן כשהעדכון מוכן
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update() })
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
