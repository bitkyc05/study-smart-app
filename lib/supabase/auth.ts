import { getServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getUser() {
  const supabase = await getServerClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

export async function signIn(email: string, password: string) {
  const supabase = await getServerClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data, error: null }
}

export async function signUp(email: string, password: string, metadata?: { full_name?: string }) {
  const supabase = await getServerClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data, error: null }
}

export async function signOut() {
  const supabase = await getServerClient()
  
  const { error } = await supabase.auth.signOut()
  
  if (!error) {
    redirect('/login')
  }
  
  return { error }
}

export async function signInWithGoogle() {
  const supabase = await getServerClient()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account', // 계정 선택 화면 강제 표시
      },
    }
  })
  
  if (error) {
    return { data: null, error: error.message }
  }
  
  return { data, error: null }
}