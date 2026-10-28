import webpush from 'web-push'

// נקרא רק מהגיליון (Api.gs → pushSend_). הגיליון שולח את רשימת המכשירים ואת ההודעה,
// ומאמת את עצמו עם אותו מפתח שהשרת משתמש בו מולו (GAS_KEY).

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.GAS_KEY || req.headers['x-sheet-key'] !== process.env.GAS_KEY) return res.status(401).json({ error: 'unauthorized' })

  webpush.setVapidDetails('mailto:orih166@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)

  const { title, body, subs } = req.body || {}
  const payload = JSON.stringify({ title: String(title || 'כלכלת בית'), body: String(body || '') })
  let sent = 0
  const gone = []
  await Promise.all((subs || []).map(async sub => {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 60 * 60 * 12, urgency: 'normal' })
      sent++
    } catch (e) {
      // המכשיר ביטל את ההרשאה או הוסר — הגיליון ימחק אותו מהרשימה
      if (e.statusCode === 404 || e.statusCode === 410) gone.push(sub.endpoint)
    }
  }))
  return res.status(200).json({ sent, gone })
}
