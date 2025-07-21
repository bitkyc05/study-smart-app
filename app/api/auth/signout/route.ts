import { getServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await getServerClient()
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to sign out' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      message: 'Successfully signed out',
      redirect: '/login'
    })
  } catch (error: any) {
    // Handle NEXT_REDIRECT error as success
    if (error?.digest?.includes('NEXT_REDIRECT')) {
      return NextResponse.json({ 
        message: 'Successfully signed out',
        redirect: '/login'
      })
    }
    
    console.error('Signout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}