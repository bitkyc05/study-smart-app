'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, PolarAngleAxis } from 'recharts'

interface TodayRadialChartProps {
  studyMinutes: number
  goalMinutes: number
}

export function TodayRadialChart({ studyMinutes, goalMinutes }: TodayRadialChartProps) {
  const percentage = goalMinutes > 0 ? Math.min((studyMinutes / goalMinutes) * 100, 100) : 0
  
  const data = [{
    name: 'Progress',
    value: percentage,
    fill: percentage >= 100 ? '#10B981' : percentage >= 70 ? '#8B5CF6' : '#5D737E'
  }]

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart 
          cx="50%" 
          cy="50%" 
          innerRadius="60%" 
          outerRadius="90%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: '#E4DCC9' }}
            dataKey="value"
            cornerRadius={10}
            fill={data[0].fill}
            animationDuration={1000}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4DCC9',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            formatter={() => [formatTime(studyMinutes), 'Study Time']}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-bold text-text-primary">{Math.round(percentage)}%</span>
        <span className="text-sm text-text-secondary mt-1">of daily goal</span>
        <span className="text-xs text-text-secondary mt-2">
          {formatTime(studyMinutes)} / {formatTime(goalMinutes)}
        </span>
      </div>
    </div>
  )
}