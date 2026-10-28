import { useState, useEffect, useCallback, useRef } from 'react'

// בפיתוח מקומי (VITE_SHEET_DEV=1) השרת של vite מעביר את הבקשה לגיליון בלי התחברות.
export const SHEET_DEV = import.meta.env.DEV && import.meta.env.VITE_SHEET_DEV === '1'

const bus = new EventTarget()
export const notifyChanged = () => bus.dispatchEvent(new Event('changed'))

async function authHeader() {
  if (SHEET_DEV) return {}
  const { supabase } = await import('../lib/supabase.js')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function callSheet(action, params = {}) {
  // לא מחכים לנצח: אחרי 25 שניות מציגים שגיאה עם אפשרות לנסות שוב
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25000)
  let r
  try {
    r = await fetch('/api/sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ action, params }),
      signal: ctrl.signal,
    })
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'הגיליון לא ענה בזמן. נסה שוב' : 'אין חיבור לאינטרנט')
  } finally { clearTimeout(timer) }
  const j = await r.json().catch(() => ({ ok: false, error: 'אין חיבור לשרת' }))
  if (!j.ok) throw new Error(j.error || 'משהו השתבש')
  return j.data
}

const readCache = key => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null }
}
const writeCache = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* אין אחסון — ממשיכים בלי */ }
}

/** קריאה מהגיליון: מציג מיד את מה שנשמר בפעם הקודמת, ומרענן ברקע. */
export function useSheet(action, params = {}) {
  const key = 'sheet:' + action + ':' + JSON.stringify(params)
  const [state, setState] = useState(() => ({ data: readCache(key), loading: true, error: null }))
  const keyRef = useRef(key)

  const reload = useCallback(async () => {
    keyRef.current = key
    if (!action) { setState({ data: null, loading: false, error: null }); return }
    setState(s => ({ data: s.data && keyRef.current === key ? s.data : readCache(key), loading: true, error: null }))
    try {
      const data = await callSheet(action, params)
      if (keyRef.current !== key) return
      writeCache(key, data)
      setState({ data, loading: false, error: null })
    } catch (e) {
      if (keyRef.current === key) setState(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setState({ data: readCache(key), loading: true, error: null })
    reload()
  }, [reload]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // שינוי מהאפליקציה, או חזרה לאפליקציה אחרי עריכה בגיליון / בבוט → מרעננים
    const onVisible = () => { if (document.visibilityState === 'visible') reload() }
    bus.addEventListener('changed', reload)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      bus.removeEventListener('changed', reload)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  return { ...state, reload }
}
