import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { firebaseConfigured, auth } from '../firebase.js'

export function useAuth() {
  // If Firebase not configured, start as null (no auth needed — shows legacy login)
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

  return { user, login, register, logout }
}
