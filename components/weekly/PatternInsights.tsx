'use client'

import { 
  ClockIcon, 
  BookOpenIcon, 
  FireIcon,
  ChartBarIcon,
  AcademicCapIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

interface InsightsData {
  total_minutes: number
  total_sessions: number
  study_days: number
  avg_session_minutes: number
  most_studied_subject: string | null
  most_productive_hour: number | null
  longest_session_minutes: number
}

interface PatternInsightsProps {
  insights: InsightsData | null
}

export default function PatternInsights({ insights }: PatternInsightsProps) {
  if (!insights) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">학습 패턴 인사이트</h3>
        <p className="text-gray-500 text-center py-8">
          이번 주에는 학습 기록이 없습니다
        </p>
      </div>
    )
  }

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`
  }

  const formatHour = (hour: number | null) => {
    if (hour === null) return '-'
    return `${hour}시`
  }

  const insightItems = [
    {
      icon: ClockIcon,
      label: '총 학습 시간',
      value: formatHours(insights.total_minutes),
      color: 'text-blue-600'
    },
    {
      icon: ChartBarIcon,
      label: '평균 세션 시간',
      value: formatHours(insights.avg_session_minutes),
      color: 'text-green-600'
    },
    {
      icon: CalendarDaysIcon,
      label: '학습한 날',
      value: `${insights.study_days}일`,
      color: 'text-purple-600'
    },
    {
      icon: FireIcon,
      label: '최장 세션',
      value: formatHours(insights.longest_session_minutes),
      color: 'text-orange-600'
    },
    {
      icon: BookOpenIcon,
      label: '주력 과목',
      value: insights.most_studied_subject || '없음',
      color: 'text-indigo-600'
    },
    {
      icon: AcademicCapIcon,
      label: '최적 시간대',
      value: formatHour(insights.most_productive_hour),
      color: 'text-pink-600'
    }
  ]

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">학습 패턴 인사이트</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {insightItems.map((item, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg bg-gray-50 ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="font-semibold text-gray-900 truncate">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional insights */}
      <div className="mt-6 p-4 bg-amber-50 rounded-lg">
        <p className="text-sm font-medium text-amber-900 mb-1">
          💪 이번 주 성과
        </p>
        <p className="text-sm text-amber-700">
          총 {insights.total_sessions}개의 학습 세션을 완료했습니다. 
          {insights.study_days >= 5 && ' 거의 매일 꾸준히 학습하고 있어요!'}
          {insights.study_days >= 3 && insights.study_days < 5 && ' 꾸준한 학습 습관을 만들어가고 있어요!'}
          {insights.study_days < 3 && ' 더 자주 학습하면 좋은 습관이 될 거예요!'}
        </p>
      </div>
    </div>
  )
}