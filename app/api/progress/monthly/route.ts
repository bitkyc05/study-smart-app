import { NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await getServerClient()
  const { searchParams } = new URL(request.url)
  
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user's D-day settings to calculate carry-over
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('study_goals')
      .eq('user_id', user.id)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 })
    }

    const studyGoals = settings.study_goals as Record<string, unknown> | null
    const ddayCreatedAt = studyGoals?.d_day_created_at ? new Date(studyGoals.d_day_created_at as string) : null
    const dday = studyGoals?.d_day ? new Date(studyGoals.d_day as string) : null

    if (!ddayCreatedAt || !dday) {
      return NextResponse.json({ 
        hasData: false,
        message: 'No D-day settings found' 
      })
    }

    // Call the RPC function to get monthly progress
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: monthlyData, error: monthlyError } = await (supabase as any)
      .rpc('get_monthly_progress', {
        p_user_id: user.id,
        p_year: year,
        p_month: month
      })

    if (monthlyError) {
      console.error('Error fetching monthly progress:', monthlyError)
      return NextResponse.json({ error: 'Failed to fetch monthly progress' }, { status: 500 })
    }

    if (!monthlyData || monthlyData.length === 0) {
      return NextResponse.json({ 
        hasData: false,
        message: 'No data for the specified month' 
      })
    }

    const monthData = monthlyData[0]

    // Calculate carry-over from previous months
    let carryOverMinutes = 0
    const monthStart = new Date(year, month - 1, 1)
    
    if (monthStart > ddayCreatedAt) {
      // Get all study sessions from D-day created date to the start of this month
      const { data: previousSessions, error: previousError } = await supabase
        .from('study_sessions')
        .select('duration_seconds')
        .eq('user_id', user.id)
        .eq('session_type', 'study')
        .eq('status', 'completed')
        .gte('start_time', ddayCreatedAt.toISOString())
        .lt('start_time', monthStart.toISOString())

      if (!previousError && previousSessions) {
        carryOverMinutes = previousSessions.reduce((sum, session) => 
          sum + (session.duration_seconds / 60), 0
        )
      }
    }

    // Calculate cumulative progress for the month
    const dailyProgress = monthData.daily_progress || []
    let cumulativeMinutes = carryOverMinutes
    
    const cumulativeData = dailyProgress.map((day: { date: string; minutes: number; goal: number; achieved: boolean }) => {
      cumulativeMinutes += day.minutes
      return {
        date: day.date,
        minutes: Math.floor(cumulativeMinutes), // Round down as per requirement
        goal: day.goal,
        achieved: day.achieved
      }
    })

    // Calculate the effective start date for this month (either month start or D-day created date)
    const effectiveStartDate = monthStart < ddayCreatedAt ? ddayCreatedAt : monthStart

    const response = {
      hasData: true,
      year,
      month,
      monthStart: monthData.month_start,
      monthEnd: monthData.month_end,
      totalMinutes: Math.floor(Number(monthData.total_minutes) || 0),
      dailyGoal: Math.floor(Number(monthData.daily_goal) || 0),
      monthlyGoal: Math.floor(Number(monthData.monthly_goal) || 0),
      carryOverMinutes: Math.floor(carryOverMinutes),
      dailyProgress: cumulativeData,
      effectiveStartDate: effectiveStartDate.toISOString().split('T')[0]
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}