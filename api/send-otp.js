export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, code } = req.body

  if (!email || !code) {
    return res.status(400).json({ error: 'Missing email or code' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'תקציב הבית <onboarding@resend.dev>',
        to: email,
        subject: 'קוד אימות — תקציב הבית',
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:400px;margin:auto;padding:40px;text-align:center">
            <h2 style="color:#1a2744">תקציב הבית 💰</h2>
            <p style="color:#6b7280">קוד האימות שלך לאיפוס הסיסמה:</p>
            <div style="background:#f0f4ff;border-radius:12px;padding:24px;margin:24px 0">
              <h1 style="font-size:52px;letter-spacing:14px;color:#1a2744;font-family:monospace;margin:0">${code}</h1>
            </div>
            <p style="color:#9ca3af;font-size:13px">הקוד תקף ל-10 דקות בלבד</p>
          </div>`,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend error:', data)
      return res.status(400).json({ error: data.message || data.error?.message || 'שגיאה בשליחת המייל' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
