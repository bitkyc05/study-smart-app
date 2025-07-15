'use client'

import { format, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useState, useEffect } from 'react'

interface DailySummary {
  day: string
  total_minutes: number
  session_count: number
  subjects: string[]
}

interface DailyTimelineProps {
  weekStart: Date
  weekEnd: Date
  dailySummaries: DailySummary[]
}

export default function DailyTimeline({ 
  weekStart, 
  dailySummaries 
}: Omit<DailyTimelineProps, 'weekEnd'>) {
  const [todayString, setTodayString] = useState('')
  
  useEffect(() => {
    setTodayString(format(new Date(), 'yyyy-MM-dd'))
  }, [])

  // Create a map for quick lookup
  const summaryMap = new Map(
    dailySummaries.map(summary => [summary.day, summary])
  )

  // Generate all days of the week
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    const dateString = format(date, 'yyyy-MM-dd')
    const summary = summaryMap.get(dateString)
    
    return {
      date,
      dateString,
      summary
    }
  })

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    
    if (hours > 0 && mins > 0) {
      return `${hours}시간 ${mins}분`
    } else if (hours > 0) {
      return `${hours}시간`
    } else {
      return `${mins}분`
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">일별 학습 기록</h3>
      
      <div className="space-y-3">
        {days.map(({ date, summary }) => {
          const isToday = todayString === format(date, 'yyyy-MM-dd')
          
          return (
            <div 
              key={format(date, 'yyyy-MM-dd')}
              className={`
                p-4 rounded-lg border transition-colors
                ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}
                ${summary ? 'hover:shadow-sm' : ''}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">
                      {format(date, 'M월 d일 EEEE', { locale: ko })}
                    </h4>
                    {isToday && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        오늘
                      </span>
                    )}
                  </div>
                  
                  {summary ? (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        학습 시간: <span className="font-medium">{formatDuration(summary.total_minutes)}</span> 
                        <span className="text-gray-400 mx-1">•</span>
                        세션: <span className="font-medium">{summary.session_count}개</span>
                      </p>
                      {summary.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {summary.subjects.map((subject, idx) => (
                            <span 
                              key={idx}
                              className="text-xs bg-white px-2 py-1 rounded border border-gray-200"
                            >
                              {subject}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">학습 기록 없음</p>
                  )}
                </div>
                
                {/* Progress bar */}
                {summary && (
                  <div className="ml-4 w-24">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min((summary.total_minutes / 240) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {Math.round((summary.total_minutes / 240) * 100)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}