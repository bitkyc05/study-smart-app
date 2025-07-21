import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    // Create a new NextResponse first
    const response = NextResponse.redirect(`${origin}${next}`)
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Ensure secure cookie settings for production
              const cookieOptions = {
                ...options,
                sameSite: 'lax' as const,
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
              }
              response.cookies.set(name, value, cookieOptions)
            })
          },
        },
      }
    )
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      console.log('OAuth login successful for user:', data.user.email)
      
      // 프로필이 자동으로 생성되었는지 확인
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()
      
      if (profileError) {
        console.error('Profile check error:', profileError)
      } else {
        console.log('Profile exists for user:', data.user.id)
      }
      
      // Get the session to ensure it's properly set
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        console.log('Session confirmed, redirecting to:', next)
        return response
      } else {
        console.error('Session not found after code exchange')
        return NextResponse.redirect(`${origin}/login?error=session_not_created`)
      }
    } else if (error) {
      console.error('Code exchange error:', error)
    }
  }

  // 인증 실패 또는 오류 시 로그인 페이지로 리디렉션
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}