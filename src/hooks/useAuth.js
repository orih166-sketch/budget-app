import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { firebaseConfigured, auth } from '../firebase.js'
import { supabase } from '../lib/supabase.js'

export function useAuth() {
  const [user, setUser] = useState(firebaseConfigured ? undefined : null)

  useEffect(() => {
    if (!firebaseConfigured || !auth) return
    return onAuthStateChanged(auth, u => {
      if (u) {
        const name = u.displayName || u.email.split('@')[0]
        setUser({ uid: u.uid, email: u.email, name, avatar: name[0].toUpperCase() })
      } else {
        setUser(null)
      }
    })
  }, [])

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function register(email, password, name) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    setUser({ uid: cred.user.uid, email, name, avatar: name[0].toUpperCase() })
  }

  async function logout() {
    if (auth) await signOut(auth)
  }

  // Step 1: generate + send OTP via Resend, store in Supabase
  async function sendResetCode(email) {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: dbErr } = await supabase
      .from('otp_codes')
      .upsert({ email, code, expires_at: expiresAt }, { onConflict: 'email' })

    if (dbErr) throw new Error('שגיאה בשמירת הקוד — ' + dbErr.message)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
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

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'שגיאה בשליחת המייל')
    }
  }

  // Step 2: verify OTP from Supabase, then auto-send Firebase reset link
  async function verifyResetCode(email, token) {
    const { data, error } = await supabase
      .from('otp_codes')
      .select('code, expires_at')
      .eq('email', email)
      .single()

    if (error || !data) throw new Error('קוד לא נמצא — שלח קוד חדש')
    if (new Date(data.expires_at) < new Date()) {
      await supabase.from('otp_codes').delete().eq('email', email)
      throw new Error('Token has expired')
    }
    if (data.code !== String(token).trim()) throw new Error('Token is invalid')

    await supabase.from('otp_codes').delete().eq('email', email)

    // OTP verified — now send Firebase reset link
    await sendPasswordResetEmail(auth, email)
  }

  return { user, login, register, logout, sendResetCode, verifyResetCode }
}
