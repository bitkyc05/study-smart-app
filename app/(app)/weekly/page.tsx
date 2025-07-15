import { Suspense } from 'react'
import { getServerClient } from '@/lib/supabase/server'
import { startOfWeek, endOfWeek, parseISO, format } from 'date-fns'
import { redirect } from 'next/navigation'
import WeeklyView from '@/components/weekly/WeeklyView'
import WeeklyViewSkeleton from '@/components/weekly/WeeklyViewSkeleton'
import { getUserTimezone } from '@/lib/user-timezone'
import { getCurrentDateInTimezone, userTimezoneToUtc } from '@/lib/date-utils'

export default async function WeeklyPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await getServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Get user's timezone and calculate dates in their timezone
  const userTimezone = await getUserTimezone()
  const params = await searchParams
  const targetDate = params.date 
    ? parseISO(params.date) 
    : getCurrentDateInTimezone(userTimezone)
  
  // Calculate week boundaries (Monday start) in user's timezone
  const weekStartInUserTz = startOfWeek(targetDate, { weekStartsOn: 1 })
  const weekEndInUserTz = endOfWeek(targetDate, { weekStartsOn: 1 })
  
  // Convert to UTC for database queries
  const weekStart = userTimezoneToUtc(weekStartInUserTz, userTimezone)
  const weekEnd = userTimezoneToUtc(weekEndInUserTz, userTimezone)

  // Fetch all the data we need in parallel
  const [
    { data: dailySummaries },
    { data: hourlyPatterns },
    { data: weekComparison },
    { data: insights }
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_daily_study_summary', {
      start_date: format(weekStart, 'yyyy-MM-dd'),
      end_date: format(weekEnd, 'yyyy-MM-dd'),
      p_user_id: user.id
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_hourly_study_pattern', {
      start_date: format(weekStart, 'yyyy-MM-dd'),
      end_date: format(weekEnd, 'yyyy-MM-dd'),
      p_user_id: user.id
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_weekly_comparison', {
      week_start: format(weekStart, 'yyyy-MM-dd'),
      p_user_id: user.id
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_study_insights', {
      start_date: format(weekStart, 'yyyy-MM-dd'),
      end_date: format(weekEnd, 'yyyy-MM-dd'),
      p_user_id: user.id
    })
  ])

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">주간 분석</h1>
        <p className="text-gray-600 mt-1">
          학습 패턴을 분석하여 더 효과적인 학습 전략을 세워보세요
        </p>
      </div>

      {/* Main Content */}
      <Suspense fallback={<WeeklyViewSkeleton />}>
        <WeeklyView
          weekStart={weekStart}
          weekEnd={weekEnd}
          dailySummaries={dailySummaries || []}
          hourlyPatterns={hourlyPatterns || []}
          weekComparison={weekComparison || []}
          insights={insights?.[0] || null}
        />
      </Suspense>
    </div>
  )
}