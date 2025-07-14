import { signIn } from '@/lib/supabase/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }
    
    const { data, error } = await signIn(email, password)
    
    if (error) {
      return NextResponse.json(
        { error: error },
        { status: 401 }
      )
    }
    
    return NextResponse.json({ 
      user: data?.user,
      session: data?.session 
    })
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}