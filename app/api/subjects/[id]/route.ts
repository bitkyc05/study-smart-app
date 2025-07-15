import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getServerClient()
  const resolvedParams = await params

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, color_hex } = body
    const subjectId = parseInt(resolvedParams.id)

    if (!name) {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 })
    }

    if (isNaN(subjectId)) {
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 })
    }

    // Update subject (only if user owns it)
    const { data: subject, error } = await supabase
      .from('subjects')
      .update({
        name,
        color_hex: color_hex || '#5D737E'
      })
      .eq('id', subjectId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating subject:', error)
      return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 })
    }

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    return NextResponse.json(subject)
  } catch (error) {
    console.error('Error in PATCH /api/subjects/[id]:', error)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getServerClient()
  const resolvedParams = await params

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const subjectId = parseInt(resolvedParams.id)

    if (isNaN(subjectId)) {
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 })
    }

    // Check if subject exists and is deletable (not "Etc")
    const { data: subject, error: fetchError } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', subjectId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    // Prevent deletion of "Etc" subject
    if (subject.name === 'Etc') {
      return NextResponse.json({ error: 'Cannot delete default Etc subject' }, { status: 400 })
    }

    // Delete subject (only if user owns it)
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting subject:', error)
      return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Subject deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/subjects/[id]:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}