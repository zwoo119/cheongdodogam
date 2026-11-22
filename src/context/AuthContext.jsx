import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// 사이트 전체에서 "누가 로그인했는지"를 알려 주는 장치
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [pf, setPf] = useState({ id: null, data: null })

  // 새로고침해도 로그인 유지: 저장된 세션을 읽고, 로그인·로그아웃 변화를 계속 감시
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // 로그인한 사용자의 프로필(이름, 권한, 계정 유형) 가져오기
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) return
    let alive = true
    supabase
      .from('profiles')
      .select('display_name, role, account_type')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => { if (alive) setPf({ id: userId, data }) })
    return () => { alive = false }
  }, [userId])

  const profileReady = !userId || pf.id === userId
  const profile = userId && pf.id === userId ? pf.data : null

  const value = {
    user: session?.user ?? null,
    profile,
    isAdmin: profile?.role === 'admin',
    isMentor: profile?.account_type === 'mentor',
    loading: sessionLoading || !profileReady,
    signUp: (email, password, name, accountType) =>
      supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name, account_type: accountType } },
      }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}