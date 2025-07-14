import { signUp } from '@/lib/supabase/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }
    
    const { data, error } = await signUp(email, password, { full_name: name })
    
    if (error) {
      return NextResponse.json(
        { error: error },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ 
      user: data?.user,
      message: 'Please check your email to confirm your account' 
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}