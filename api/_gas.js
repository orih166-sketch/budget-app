import https from 'node:https'

// קריאה לגיליון (Apps Script). לא משתמשים ב-fetch: מדי פעם הוא נתקע על חיבור ישן שנשמר בין הפעלות
// של הפונקציה ב-Vercel, והבקשה מחכה עד שהפונקציה נחתכת. כאן כל קריאה פותחת חיבור חדש, מוגבלת בזמן,
// ונשלחת שוב אם נתקעה.

function request(url, { method = 'GET', body = null, timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method,
      agent: false,
      family: 4, // בשרת של Vercel חיבור IPv6 לגוגל נתקע לפעמים בלי תשובה
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {},
      timeout,
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location, text: Buffer.concat(chunks).toString('utf8') }))
      res.on('error', reject)
    })
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

/** שולח פעולה ל-Api.gs ומחזיר את התשובה כאובייקט ({ok, data} או {ok:false, error}). */
export async function callGas(action, params = {}, { tries = 3 } = {}) {
  const body = JSON.stringify({ key: process.env.GAS_KEY, action, params })
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      const t0 = Date.now()
      let r = await request(process.env.GAS_URL, { method: 'POST', body, timeout: 30000 })
      const t1 = Date.now()
      // Apps Script עונה בהפניה לכתובת התוצאה, שאותה קוראים ב-GET
      for (let hops = 0; r.status >= 300 && r.status < 400 && r.location && hops < 3; hops++) r = await request(r.location)
      console.log('gas', action, 'post', t1 - t0, 'ms, result', Date.now() - t1, 'ms')
      return JSON.parse(r.text)
    } catch (e) {
      lastErr = e
      console.log('gas', action, 'try', i + 1, 'failed:', e.message)
    }
  }
  throw lastErr
}
