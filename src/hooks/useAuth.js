import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useAuth() {
  const [user, setUser] = useState(undefined)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session ? formatUser(session.user) : null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsPasswordRecovery(event === 'PASSWORD_RECOVERY')
      setUser(session ? formatUser(session.user) : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function register(email, password, name) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    // Household is auto-created by the handle_new_user database trigger
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function sendResetCode(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    setIsPasswordRecovery(false)
  }

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function sendPhoneOtp(phone) {
    const { error } = await supabase.auth.signInWithOtp({ phone })
    if (error) throw error
  }

  async function verifyPhoneOtp(phone, token) {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    if (error) throw error
  }

  return { user, isPasswordRecovery, login, register, logout, sendResetCode, updatePassword, loginWithGoogle, sendPhoneOtp, verifyPhoneOtp }
}

function formatUser(u) {
  const name = u.user_metadata?.name || u.email.split('@')[0]
  return { uid: u.id, email: u.email, name, avatar: name[0].toUpperCase() }
}
