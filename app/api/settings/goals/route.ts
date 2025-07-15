import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { StudyGoalSettings } from '@/types/settings'
import { Json } from '@/types/database.types'

export async function GET() {
  const supabase = await getServerClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch user settings
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('study_goals')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }

  // Return study goals or default values
  const studyGoals: StudyGoalSettings = (settings?.study_goals as unknown as StudyGoalSettings) || {
    d_day: null,
    d_day_title: '',
    d_day_created_at: null,
    total_goal_minutes: 0,
    weekly_goal_minutes: 0,
    subject_allocations: {},
    include_etc_subject: true,
    auto_rebalance: true
  }

  return NextResponse.json(studyGoals)
}

export async function PATCH(request: Request) {
  const supabase = await getServerClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const studyGoals: StudyGoalSettings = await request.json()

    // Sanitize the input to create a plain, serializable object
    // This prevents non-serializable properties from a client-side
    // store from being sent to the database
    const cleanStudyGoals = {
      d_day: studyGoals.d_day,
      d_day_title: studyGoals.d_day_title,
      d_day_created_at: studyGoals.d_day_created_at,
      total_goal_minutes: studyGoals.total_goal_minutes,
      weekly_goal_minutes: studyGoals.weekly_goal_minutes,
      subject_allocations: studyGoals.subject_allocations,
      include_etc_subject: studyGoals.include_etc_subject,
      auto_rebalance: studyGoals.auto_rebalance
    }

    // Perform a more robust upsert operation
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        study_goals: cleanStudyGoals as unknown as Json,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select('study_goals')
      .single()

    if (error) {
      console.error('Error updating settings:', {
        message: error.message,
        details: error.details,
        code: error.code,
        user_id: user.id
      })
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json(data.study_goals)
  } catch (error) {
    console.error('Error in PATCH /api/settings/goals:', error)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}