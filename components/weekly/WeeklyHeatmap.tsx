'use client'

import { useMemo } from 'react'

interface HeatmapData {
  day_of_week: number
  hour: number
  total_minutes: number
  session_count: number
}

interface WeeklyHeatmapProps {
  data: HeatmapData[]
}

export default function WeeklyHeatmap({ data }: WeeklyHeatmapProps) {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // Create a map for quick lookup and calculate max value
  const { heatmapMap, maxMinutes } = useMemo(() => {
    const map = new Map<string, HeatmapData>()
    let max = 0

    data.forEach(item => {
      const key = `${item.day_of_week}-${item.hour}`
      map.set(key, item)
      if (item.total_minutes > max) {
        max = item.total_minutes
      }
    })

    return { heatmapMap: map, maxMinutes: max }
  }, [data])

  // Find the most productive hours
  const optimalHours = useMemo(() => {
    const hourlyTotals = hours.map(hour => {
      let total = 0
      for (let day = 0; day < 7; day++) {
        const data = heatmapMap.get(`${day}-${hour}`)
        if (data) total += data.total_minutes
      }
      return { hour, total }
    })

    return hourlyTotals
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map(h => h.hour)
  }, [heatmapMap, hours])

  // Get color class based on intensity
  const getColorClass = (minutes: number) => {
    if (minutes === 0) return 'bg-gray-100'
    const intensity = maxMinutes > 0 ? minutes / maxMinutes : 0
    
    if (intensity > 0.8) return 'bg-blue-600'
    if (intensity > 0.6) return 'bg-blue-500'
    if (intensity > 0.4) return 'bg-blue-400'
    if (intensity > 0.2) return 'bg-blue-300'
    return 'bg-blue-200'
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">주간 학습 패턴</h3>
        <p className="text-sm text-gray-500 mt-1">
          색이 진할수록 해당 시간대에 많이 학습했습니다
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="w-12" />
            {days.map((day) => (
              <div key={day} className="text-center text-sm font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-1">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-8 gap-1">
                {/* Hour label */}
                <div className="w-12 text-right text-xs text-gray-500 pr-2 flex items-center justify-end">
                  {String(hour).padStart(2, '0')}:00
                </div>
                
                {/* Heatmap cells */}
                {days.map((_, dayIndex) => {
                  const cellData = heatmapMap.get(`${dayIndex}-${hour}`)
                  const minutes = cellData?.total_minutes || 0
                  const sessions = cellData?.session_count || 0
                  const isOptimal = optimalHours.includes(hour)
                  
                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className="relative group"
                    >
                      <div
                        className={`
                          aspect-square rounded cursor-pointer
                          transition-all duration-200 hover:scale-110
                          ${getColorClass(minutes)}
                          ${isOptimal && minutes > 0 ? 'ring-2 ring-blue-700 ring-offset-1' : ''}
                        `}
                      />
                      
                      {/* Tooltip */}
                      {minutes > 0 && (
                        <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
                          <div>{days[dayIndex]}요일 {hour}시</div>
                          <div>학습 시간: {Math.round(minutes)}분</div>
                          <div>세션 수: {sessions}개</div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center gap-4">
            <span className="text-sm text-gray-500">적음</span>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-gray-100 rounded" />
              <div className="w-6 h-6 bg-blue-200 rounded" />
              <div className="w-6 h-6 bg-blue-300 rounded" />
              <div className="w-6 h-6 bg-blue-400 rounded" />
              <div className="w-6 h-6 bg-blue-500 rounded" />
              <div className="w-6 h-6 bg-blue-600 rounded" />
            </div>
            <span className="text-sm text-gray-500">많음</span>
          </div>

          {/* Insights */}
          {optimalHours.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">
                💡 최적 학습 시간대
              </p>
              <p className="text-sm text-blue-700">
                {optimalHours.map(h => `${h}시`).join(', ')}에 가장 집중도가 높습니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}