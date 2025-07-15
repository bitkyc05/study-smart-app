import { getServerClient } from '@/lib/supabase/server'
import { startOfDay, startOfWeek, subDays, format } from 'date-fns'
import { getUserTimezone } from '@/lib/user-timezone'
import { getCurrentDateInTimezone, userTimezoneToUtc, utcToUserTimezone } from '@/lib/date-utils'

export interface StudySession {
  id: number
  user_id: string
  subject_id: number | null
  session_type: string
  start_time: string
  end_time: string
  duration_seconds: number
  status: string | null
  subjects?: {
    id: number
    name: string
    color_hex: string | null
  } | null
}

export interface DashboardStats {
  todayStudyTime: number
  weeklyStudyTime: number
  weeklyGoal: number
  dailyGoal: number
  todaySessionCount: number
  totalSessionCount: number
  weeklyProgress: number
  recentSessions: StudySession[]
  subjectBreakdown: { name: string; color: string; duration: number }[]
  weeklyChartData: { date: string; minutes: number }[]
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const supabase = await getServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null

    // Get user's timezone
    const userTimezone = await getUserTimezone()
    
    // Get current date in user's timezone
    const todayInUserTz = getCurrentDateInTimezone(userTimezone)
    
    // Calculate date ranges in user's timezone
    const todayStartInUserTz = startOfDay(todayInUserTz)
    const weekStartInUserTz = startOfWeek(todayInUserTz, { weekStartsOn: 1 })
    const sevenDaysAgoInUserTz = subDays(todayInUserTz, 6)
    
    // Convert to UTC for database queries
    const todayStart = userTimezoneToUtc(todayStartInUserTz, userTimezone)
    const todayEnd = userTimezoneToUtc(new Date(todayInUserTz.getTime() + 24 * 60 * 60 * 1000), userTimezone)
    const weekStart = userTimezoneToUtc(weekStartInUserTz, userTimezone)
    const sevenDaysAgo = userTimezoneToUtc(sevenDaysAgoInUserTz, userTimezone)

    // Fetch today's sessions
    const { data: todaySessions } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'study')
      .in('status', ['completed', 'in_progress'])
      .gte('start_time', todayStart.toISOString())
      .lt('start_time', todayEnd.toISOString())

    // Fetch this week's sessions
    const { data: weeklySessions } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'study')
      .in('status', ['completed', 'in_progress'])
      .gte('start_time', weekStart.toISOString())
      .lt('start_time', todayEnd.toISOString())

    // Fetch recent sessions with subjects
    const { data: recentSessions } = await supabase
      .from('study_sessions')
      .select(`
        *,
        subjects (
          id,
          name,
          color_hex
        )
      `)
      .eq('user_id', user.id)
      .eq('session_type', 'study')
      .eq('status', 'completed')
      .order('end_time', { ascending: false })
      .limit(5)

    // Fetch all sessions from last 7 days for chart
    const { data: chartSessions } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_type', 'study')
      .in('status', ['completed', 'in_progress'])
      .gte('start_time', sevenDaysAgo.toISOString())
      .lt('start_time', todayEnd.toISOString())

    // Fetch user settings for weekly goal
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('study_goals')
      .eq('user_id', user.id)
      .single()

    // Calculate statistics
    const todayStudyTime = todaySessions?.reduce((acc, session) => 
      acc + (session.duration_seconds || 0), 0) || 0

    const weeklyStudyTime = weeklySessions?.reduce((acc, session) => 
      acc + (session.duration_seconds || 0), 0) || 0

    // Extract weekly goal from user settings or use default
    const studyGoals = userSettings?.study_goals as { weekly_goal_minutes?: number } | null
    const weeklyGoalMinutes = studyGoals?.weekly_goal_minutes || 2000 // Default 2000 minutes
    const weeklyGoal = weeklyGoalMinutes * 60 // Convert to seconds
    const dailyGoal = Math.round(weeklyGoalMinutes / 7) // Calculate daily goal in minutes
    const weeklyProgress = weeklyGoal > 0 ? (weeklyStudyTime / weeklyGoal) * 100 : 0

    // Process subject breakdown
    const subjectMap = new Map<string, { name: string; color: string; duration: number }>()
    
    recentSessions?.forEach(session => {
      if (session.subjects && session.subjects.name) {
        const key = session.subjects.name
        if (!subjectMap.has(key)) {
          subjectMap.set(key, {
            name: key,
            color: session.subjects.color_hex || '#5D737E',
            duration: 0
          })
        }
        const subject = subjectMap.get(key)!
        subject.duration += session.duration_seconds || 0
      } else {
        // Handle sessions without subjects
        const key = 'Other'
        if (!subjectMap.has(key)) {
          subjectMap.set(key, {
            name: key,
            color: '#8A7E70',
            duration: 0
          })
        }
        const subject = subjectMap.get(key)!
        subject.duration += session.duration_seconds || 0
      }
    })

    const subjectBreakdown = Array.from(subjectMap.values())
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5) // Top 5 subjects

    // Process weekly chart data
    const dailyMap = new Map<string, number>()
    
    // Initialize all days with 0 in user's timezone
    for (let i = 6; i >= 0; i--) {
      const date = subDays(todayInUserTz, i)
      const dateKey = format(date, 'yyyy-MM-dd')
      dailyMap.set(dateKey, 0)
    }

    // Aggregate sessions by day
    chartSessions?.forEach(session => {
      // Convert session time to user's timezone before formatting
      const sessionDateInUserTz = utcToUserTimezone(new Date(session.start_time), userTimezone)
      const dateKey = format(sessionDateInUserTz, 'yyyy-MM-dd')
      if (dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, 
          dailyMap.get(dateKey)! + (session.duration_seconds || 0)
        )
      }
    })

    const weeklyChartData = Array.from(dailyMap.entries()).map(([date, seconds]) => ({
      date,
      minutes: Math.round(seconds / 60)
    }))

    return {
      todayStudyTime,
      weeklyStudyTime,
      weeklyGoal,
      dailyGoal,
      todaySessionCount: todaySessions?.length || 0,
      totalSessionCount: recentSessions?.length || 0,
      weeklyProgress,
      recentSessions: recentSessions || [],
      subjectBreakdown,
      weeklyChartData
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return null
  }
}

// Helper function to format seconds to human readable time
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Helper function to format time for display
export function formatTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleTimeString(undefined, { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}