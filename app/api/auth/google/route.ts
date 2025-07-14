import { signInWithGoogle } from '@/lib/supabase/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data, error } = await signInWithGoogle()
    
    if (error) {
      return NextResponse.json(
        { error: error },
        { status: 500 }
      )
    }
    
    if (data?.url) {
      return NextResponse.redirect(data.url)
    }
    
    return NextResponse.json(
      { error: 'Failed to get OAuth URL' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}