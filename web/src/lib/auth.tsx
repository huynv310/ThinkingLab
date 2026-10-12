import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

export type AuthMode = 'login' | 'signup'

interface AuthState {
  session: Session | null
  loading: boolean
  authModal: AuthMode | null
  openAuth: (mode?: AuthMode) => void
  closeAuth: () => void
}

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  authModal: null,
  openAuth: () => {},
  closeAuth: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModal, setAuthModal] = useState<AuthMode | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
      if (newSession) setAuthModal(null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const openAuth = (mode: AuthMode = 'login') => setAuthModal(mode)
  const closeAuth = () => setAuthModal(null)

  return (
    <AuthContext.Provider value={{ session, loading, authModal, openAuth, closeAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

export function displayName(session: Session | null) {
  const meta = session?.user.user_metadata as { full_name?: string } | undefined
  return meta?.full_name?.trim() || session?.user.email?.split('@')[0] || 'bạn'
}
