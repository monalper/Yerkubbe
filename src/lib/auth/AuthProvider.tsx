import { type Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

export type Profile = { id: string; role: 'admin' | 'editor' | 'reader' | null }

type AuthState = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session ?? null)
      setLoading(false)
    }

    void init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadProfile() {
      if (!session?.user) {
        setProfile(null)
        setProfileLoading(false)
        return
      }
      setProfileLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!mounted) return
      if (error) {
        setProfile({ id: session.user.id, role: null })
        setProfileLoading(false)
        return
      }
      if (data) {
        setProfile((data as Profile) ?? { id: session.user.id, role: null })
        setProfileLoading(false)
        return
      }

      // Eğer auth.users trigger çalışmıyorsa, kendi profil satırını (role=reader) oluşturmayı dene.
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: session.user.id, role: 'reader' })
      if (!mounted) return
      if (insertError) {
        setProfile({ id: session.user.id, role: null })
        setProfileLoading(false)
        return
      }
      const { data: data2 } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!mounted) return
      setProfile((data2 as Profile | null) ?? { id: session.user.id, role: null })
      setProfileLoading(false)
    }
    void loadProfile()
    return () => {
      mounted = false
    }
  }, [session?.user?.id])

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      profileLoading,
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [loading, profile, profileLoading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
