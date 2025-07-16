import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'
import { TimerSettings } from '@/types/timer.types'
import { Json } from '@/types/database.types'

const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  studyDuration: 25 * 60,
  shortBreakDuration: 5 * 60,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  autoStartBreakOnStudyStop: false,
  autoStartStudyOnBreakStop: false,
  notificationsEnabled: true,
  availableStudyDurations: [15 * 60, 20 * 60, 25 * 60, 30 * 60, 45 * 60],
  availableBreakDurations: [5 * 60, 10 * 60, 15 * 60, 20 * 60]
}

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
    .select('preferences')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching timer settings:', error)
    return NextResponse.json({ error: 'Failed to fetch timer settings' }, { status: 500 })
  }

  // Return timer settings from preferences or default values
  const preferences = (settings?.preferences as Record<string, unknown>) || {}
  const timerSettings: TimerSettings = {
    ...DEFAULT_TIMER_SETTINGS,
    ...(preferences.timer as Partial<TimerSettings> || {})
  }

  return NextResponse.json(timerSettings)
}

export async function PATCH(request: Request) {
  const supabase = await getServerClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const timerSettings: TimerSettings = await request.json()

    // Sanitize the input to create a plain, serializable object
    const cleanTimerSettings = {
      studyDuration: timerSettings.studyDuration,
      shortBreakDuration: timerSettings.shortBreakDuration,
      autoStartBreaks: timerSettings.autoStartBreaks,
      autoStartPomodoros: timerSettings.autoStartPomodoros,
      autoStartBreakOnStudyStop: timerSettings.autoStartBreakOnStudyStop,
      autoStartStudyOnBreakStop: timerSettings.autoStartStudyOnBreakStop,
      notificationsEnabled: timerSettings.notificationsEnabled,
      availableStudyDurations: timerSettings.availableStudyDurations,
      availableBreakDurations: timerSettings.availableBreakDurations
    }

    // First, get current preferences
    const { data: currentSettings } = await supabase
      .from('user_settings')
      .select('preferences')
      .eq('user_id', user.id)
      .single()

    const currentPreferences = (currentSettings?.preferences as Record<string, unknown>) || {}

    // Update timer settings within preferences
    const updatedPreferences = {
      ...currentPreferences,
      timer: cleanTimerSettings
    }

    // Perform upsert operation
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        preferences: updatedPreferences as unknown as Json,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select('preferences')
      .single()

    if (error) {
      console.error('Error updating timer settings:', {
        message: error.message,
        details: error.details,
        code: error.code,
        user_id: user.id
      })
      return NextResponse.json({ error: 'Failed to update timer settings' }, { status: 500 })
    }

    const savedPreferences = (data.preferences as Record<string, unknown>) || {}
    return NextResponse.json((savedPreferences.timer as TimerSettings) || cleanTimerSettings)
  } catch (error) {
    console.error('Error in PATCH /api/settings/timer:', error)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}