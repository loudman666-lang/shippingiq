import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [merchant, setMerchant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setMerchant(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId, attempt = 1) {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, merchants(*)')
        .eq('id', userId)
        .single()

      if (profileError) {
        if (attempt < 5) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500))
          return fetchProfile(userId, attempt + 1)
        }
        throw profileError
      }

      // Invited user: profile exists but no merchant association yet
      if (profileData && !profileData.merchant_id && attempt < 5) {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        const merchantId = currentUser?.user_metadata?.merchant_id
        const role = currentUser?.user_metadata?.role || 'member'
        if (merchantId) {
          await supabase.from('profiles').update({ merchant_id: merchantId, role }).eq('id', userId)
          await new Promise(resolve => setTimeout(resolve, 300))
          return fetchProfile(userId, attempt + 1)
        }
      }

      setProfile(profileData)
      setMerchant(profileData.merchants)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTeamMembers(merchantId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: true })
    setTeamMembers(data || [])
  }

  async function signUp({ email, password, fullName, storeName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, store_name: storeName } }
    })
    if (error) throw error
    return data
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  const isAdmin = profile?.role === 'admin'
  const planTier = merchant?.plan ?? 'free'

  return (
    <AuthContext.Provider value={{
      user, profile, merchant, loading, isAdmin, planTier, teamMembers,
      signUp, signIn, signOut, resetPassword, updatePassword, fetchProfile, fetchTeamMembers
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
