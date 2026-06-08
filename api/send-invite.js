export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, inviterName, inviteUrl, householdName } = req.body

  if (!email || !inviteUrl) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VITE_RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'תקציב הבית <onboarding@resend.dev>',
        to: email,
        subject: `${inviterName} מזמין/ת אותך לנהל תקציב משותף`,
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:40px;background:#f9fafb;border-radius:16px;text-align:center">
            <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
              <div style="font-size:48px;margin-bottom:8px">💰</div>
              <h2 style="color:#1a2744;margin:0 0 8px">תקציב הבית</h2>
              <p style="color:#374151;font-size:16px;margin:16px 0">
                <strong>${inviterName}</strong> מזמין/ת אותך לנהל<br/>
                את <strong>${householdName}</strong> יחד.
              </p>
              <a href="${inviteUrl}"
                 style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:bold;margin:24px 0">
                הצטרף/י לתקציב המשותף ←
              </a>
              <p style="color:#9ca3af;font-size:12px;margin-top:24px">
                ההזמנה תקפה ל-7 ימים · אם לא ביקשת זאת, פשוט התעלם/י
              </p>
            </div>
          </div>`,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend error:', data)
      return res.status(400).json({ error: data.message || 'שגיאה בשליחת ההזמנה' })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
