'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface SubjectPieChartProps {
  data: { name: string; color: string; duration: number }[]
}

export function SubjectPieChart({ data }: SubjectPieChartProps) {
  const chartData = data.map(item => ({
    name: item.name,
    value: Math.round(item.duration / 60), // Convert to minutes
    color: item.color
  }))

  const totalMinutes = chartData.reduce((acc, item) => acc + item.value, 0)

  const renderCustomLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }: {
    cx: number
    cy: number
    midAngle: number
    innerRadius: number
    outerRadius: number
    percent: number
  }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.05) return null // Don't show label for small slices

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  const CustomTooltip = ({ active, payload }: {
    active?: boolean
    payload?: Array<{ value: number; name: string; payload: { color: string } }>
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const hours = Math.floor(data.value / 60)
      const minutes = data.value % 60
      
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-accent">
          <p className="font-medium text-text-primary">{data.name}</p>
          <p className="text-sm text-text-secondary">
            {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
          </p>
          <p className="text-sm" style={{ color: data.payload.color }}>
            {((data.value / totalMinutes) * 100).toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-text-secondary">No data available</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          animationBegin={0}
          animationDuration={1000}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value) => (
            <span className="text-text-primary text-sm">{value}</span>
          )}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  )
}