'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'

interface WeeklyBarChartProps {
  data: { date: string; minutes: number }[]
}

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    day: format(parseISO(item.date), 'E'),
    hours: item.minutes / 60
  }))

  const maxHours = Math.max(...formattedData.map(d => d.hours), 4)
  const yAxisTicks = Array.from({ length: Math.ceil(maxHours) + 1 }, (_, i) => i)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={formattedData} 
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="#E4DCC9" 
          vertical={false}
        />
        <XAxis 
          dataKey="day" 
          stroke="#5D737E"
          tick={{ fill: '#5D737E', fontSize: 12 }}
          axisLine={{ stroke: '#E4DCC9' }}
        />
        <YAxis 
          stroke="#5D737E"
          tick={{ fill: '#5D737E', fontSize: 12 }}
          axisLine={{ stroke: '#E4DCC9' }}
          ticks={yAxisTicks}
          domain={[0, Math.ceil(maxHours)]}
          label={{ 
            value: 'Hours', 
            angle: -90, 
            position: 'insideLeft',
            style: { fill: '#5D737E', fontSize: 12 }
          }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#FFFFFF',
            border: '1px solid #E4DCC9',
            borderRadius: '8px',
            padding: '8px 12px'
          }}
          labelStyle={{ color: '#5D737E', marginBottom: '4px' }}
          itemStyle={{ color: '#5D737E' }}
          formatter={(value: number) => [`${value.toFixed(1)}h`, 'Study Time']}
        />
        <Bar 
          dataKey="hours" 
          fill="#5D737E"
          radius={[8, 8, 0, 0]}
          animationDuration={1000}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}