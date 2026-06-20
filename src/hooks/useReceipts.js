import { useState, useCallback } from 'react'

const LS_KEY = 'budget_receipts'

function loadMap() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} }
  catch { return {} }
}

export function useReceipts() {
  const [map, setMap] = useState(loadMap)

  const attach = useCallback(async (txId, file) => {
    const b64 = await compress(file)
    setMap(prev => {
      const next = { ...prev, [txId]: b64 }
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const remove = useCallback((txId) => {
    setMap(prev => {
      const next = { ...prev }
      delete next[txId]
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { map, attach, remove }
}

function compress(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1400
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else       { w = Math.round(w * MAX / h); h = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
