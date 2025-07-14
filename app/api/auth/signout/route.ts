import { signOut } from '@/lib/supabase/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const { error } = await signOut()
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to sign out' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      message: 'Successfully signed out' 
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}