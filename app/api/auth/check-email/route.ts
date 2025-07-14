import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create admin client with service role key for checking users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    
    // Check if user exists using admin API
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      console.error('Error checking email:', error)
      return NextResponse.json(
        { error: 'Failed to check email' },
        { status: 500 }
      )
    }
    
    const exists = users && users.users.some(user => user.email === email)
    
    // Don't reveal specific details about why email is unavailable
    if (exists) {
      return NextResponse.json({ 
        available: false,
        message: 'This email is already in use'
      })
    }
    
    return NextResponse.json({ 
      available: true,
      message: 'Email is available'
    })
  } catch (error) {
    console.error('Check email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}