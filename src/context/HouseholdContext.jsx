import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const HouseholdContext = createContext(null)

export function useHousehold() {
  return useContext(HouseholdContext)
}

export function HouseholdProvider({ user, children }) {
  const [household, setHousehold] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setHousehold(null); setMembers([]); setLoading(false); return }
    loadHousehold()
  }, [user?.uid])

  async function loadHousehold() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('role, households(id, name)')
        .eq('user_id', user.uid)
        .single()

      if (error || !data?.households) {
        // No household yet — create one now (handles users who registered before the DB trigger)
        await bootstrapHousehold()
        return
      }

      const h = data.households
      setHousehold(h)

      const { data: allMembers } = await supabase
        .from('household_members')
        .select('user_id, role, joined_at')
        .eq('household_id', h.id)

      setMembers(allMembers || [])
    } catch (e) {
      console.error('HouseholdContext load:', e)
    } finally {
      setLoading(false)
    }
  }

  async function bootstrapHousehold() {
    try {
      const { data: h, error: hErr } = await supabase
        .from('households')
        .insert({ name: 'משפחת ' + user.name })
        .select()
        .single()

      if (hErr) { console.error('bootstrapHousehold:', hErr); return }

      const { error: mErr } = await supabase
        .from('household_members')
        .insert({ household_id: h.id, user_id: user.uid, role: 'owner' })

      if (mErr) { console.error('bootstrapHousehold members:', mErr); return }

      setHousehold(h)
      setMembers([{ user_id: user.uid, role: 'owner', joined_at: new Date().toISOString() }])
    } catch (e) {
      console.error('bootstrapHousehold:', e)
    } finally {
      setLoading(false)
    }
  }

  async function invitePartner(email) {
    if (!household) throw new Error('אין משק בית מוגדר')

    const { data: inv, error } = await supabase
      .from('household_invitations')
      .insert({
        household_id: household.id,
        invited_email: email.trim().toLowerCase(),
        invited_by: user.uid,
      })
      .select()
      .single()

    if (error) throw error

    const inviteUrl = `${window.location.origin}?invite=${inv.token}`
    const res = await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        inviterName: user.name,
        inviteUrl,
        householdName: household.name,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'שגיאה בשליחת ההזמנה')
    }
  }

  async function acceptInvitation(token) {
    const { error } = await supabase.rpc('accept_household_invitation', {
      invitation_token: token,
    })
    if (error) throw error
    await loadHousehold()
  }

  return (
    <HouseholdContext.Provider value={{ household, members, loading, invitePartner, acceptInvitation, refetch: loadHousehold }}>
      {children}
    </HouseholdContext.Provider>
  )
}
