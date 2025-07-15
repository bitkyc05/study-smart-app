import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await getServerClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch user's subjects
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('id, name, color_hex')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching subjects:', error)
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
  }

  return NextResponse.json(subjects || [])
}

export async function POST(request: Request) {
  const supabase = await getServerClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, color_hex } = body

    if (!name) {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 })
    }

    // Create subject
    const { data: subject, error } = await supabase
      .from('subjects')
      .insert({
        user_id: user.id,
        name,
        color_hex: color_hex || '#5D737E' // Default color
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating subject:', error)
      return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 })
    }

    return NextResponse.json(subject)
  } catch (error) {
    console.error('Error in POST /api/subjects:', error)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}