'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface ComparisonData {
  week_offset: number
  day_of_week: number
  total_minutes: number
}

interface WeekComparisonProps {
  data: ComparisonData[]
}

const dayNames = ['일', '월', '화', '수', '목', '금', '토'] as const

export default function WeekComparison({ data }: WeekComparisonProps) {
  
  // Transform data for the chart
  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => ({
      day: dayNames[i],
      dayIndex: i,
      thisWeek: 0,
      lastWeek: 0
    }))

    data.forEach(item => {
      const dayData = days.find(d => d.dayIndex === item.day_of_week)
      if (dayData) {
        if (item.week_offset === 0) {
          dayData.thisWeek = Math.round(item.total_minutes / 60 * 10) / 10 // Convert to hours
        } else {
          dayData.lastWeek = Math.round(item.total_minutes / 60 * 10) / 10
        }
      }
    })

    return days
  }, [data, dayNames])

  // Calculate totals and improvement
  const { totalThisWeek, totalLastWeek, improvement } = useMemo(() => {
    const thisWeek = chartData.reduce((sum, d) => sum + d.thisWeek, 0)
    const lastWeek = chartData.reduce((sum, d) => sum + d.lastWeek, 0)
    const improve = lastWeek > 0 
      ? ((thisWeek - lastWeek) / lastWeek * 100).toFixed(1)
      : '0'
    
    return {
      totalThisWeek: thisWeek.toFixed(1),
      totalLastWeek: lastWeek.toFixed(1),
      improvement: improve
    }
  }, [chartData])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number; name: string }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-medium mb-1">{label}요일</p>
          <p className="text-sm text-blue-600">
            이번 주: {payload[0]?.value || 0}시간
          </p>
          <p className="text-sm text-gray-500">
            지난 주: {payload[1]?.value || 0}시간
          </p>
          {payload[0]?.value && payload[1]?.value && (
            <p className="text-sm font-medium mt-1">
              {payload[0].value > payload[1].value ? '📈' : '📉'} 
              {Math.abs((payload[0].value - payload[1].value)).toFixed(1)}시간 차이
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold">주간 비교</h3>
          <p className="text-sm text-gray-500 mt-1">
            지난 주 대비 학습 시간 변화
          </p>
        </div>
        
        <div className={`
          px-3 py-1 rounded-full text-sm font-medium
          ${Number(improvement) > 0 
            ? 'bg-green-100 text-green-700' 
            : Number(improvement) < 0
            ? 'bg-red-100 text-red-700'
            : 'bg-gray-100 text-gray-700'
          }
        `}>
          {Number(improvement) > 0 ? '↑' : Number(improvement) < 0 ? '↓' : ''} 
          {Math.abs(Number(improvement))}%
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorThisWeek" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorLastWeek" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              label={{ value: '시간', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="thisWeek"
              name="이번 주"
              stroke="#3B82F6"
              fillOpacity={1}
              fill="url(#colorThisWeek)"
            />
            <Area
              type="monotone"
              dataKey="lastWeek"
              name="지난 주"
              stroke="#9CA3AF"
              fillOpacity={1}
              fill="url(#colorLastWeek)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">이번 주 총 학습</p>
          <p className="text-xl font-bold text-blue-600">{totalThisWeek}시간</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">지난 주 총 학습</p>
          <p className="text-xl font-bold text-gray-600">{totalLastWeek}시간</p>
        </div>
      </div>
    </div>
  )
}