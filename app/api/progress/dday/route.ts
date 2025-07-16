import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await getServerClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Call the RPC function to get D-day progress
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .rpc('calculate_dday_progress', {
        p_user_id: user.id
      })

    if (error) {
      console.error('Error fetching D-day progress:', error)
      return NextResponse.json({ error: 'Failed to fetch D-day progress' }, { status: 500 })
    }

    // Check if data exists and has the expected structure
    if (!data || data.length === 0 || !data[0].start_date) {
      return NextResponse.json({ 
        hasData: false,
        message: 'No D-day settings found' 
      })
    }

    const progressData = data[0]

    // Format the response
    const response = {
      hasData: true,
      accumulatedMinutes: Number(progressData.accumulated_minutes) || 0,
      dailyProgress: progressData.daily_progress || [],
      startDate: progressData.start_date,
      endDate: progressData.end_date,
      daysElapsed: progressData.days_elapsed || 0,
      daysRemaining: progressData.days_remaining || 0
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}