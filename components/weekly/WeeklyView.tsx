'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import WeekSelector from './WeekSelector'
import WeeklyHeatmap from './WeeklyHeatmap'
import WeekComparison from './WeekComparison'
import PatternInsights from './PatternInsights'
import DailyTimeline from './DailyTimeline'

interface WeeklyViewProps {
  weekStart: Date
  weekEnd: Date
  dailySummaries: Array<{
    day: string
    total_minutes: number
    session_count: number
    subjects: string[]
  }>
  hourlyPatterns: Array<{
    day_of_week: number
    hour: number
    total_minutes: number
    session_count: number
  }>
  weekComparison: Array<{
    week_offset: number
    day_of_week: number
    total_minutes: number
  }>
  insights: {
    total_minutes: number
    total_sessions: number
    study_days: number
    avg_session_minutes: number
    most_studied_subject: string | null
    most_productive_hour: number | null
    longest_session_minutes: number
  } | null
}

export default function WeeklyView({
  weekStart,
  weekEnd,
  dailySummaries,
  hourlyPatterns,
  weekComparison,
  insights
}: WeeklyViewProps) {
  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-medium">
            {format(weekStart, 'yyyy년 MM월 dd일', { locale: ko })} - 
            {format(weekEnd, 'MM월 dd일', { locale: ko })}
          </p>
        </div>
        <WeekSelector currentDate={weekStart} />
      </div>

      {/* Main Heatmap */}
      <WeeklyHeatmap data={hourlyPatterns} />

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <WeekComparison data={weekComparison} />
        <PatternInsights insights={insights} />
      </div>

      {/* Daily Timeline */}
      <DailyTimeline 
        weekStart={weekStart} 
        dailySummaries={dailySummaries}
      />
    </div>
  )
}