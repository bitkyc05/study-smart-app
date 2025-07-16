'use client'

import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type ViewMode = 'dday' | 'monthly'

interface DdayProgressData {
  hasData: boolean
  accumulatedMinutes: number
  dailyProgress: Array<{ date: string; minutes: number }>
  startDate: string
  endDate: string
  daysElapsed: number
  daysRemaining: number
}

interface MonthlyProgressData {
  hasData: boolean
  year: number
  month: number
  monthStart: string
  monthEnd: string
  totalMinutes: number
  dailyGoal: number
  monthlyGoal: number
  carryOverMinutes: number
  dailyProgress: Array<{ date: string; minutes: number; goal: number; achieved: boolean }>
  effectiveStartDate: string
}

export function DdayProgressChart() {
  const [viewMode, setViewMode] = useState<ViewMode>('dday')
  const [ddayData, setDdayData] = useState<DdayProgressData | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Current month for monthly view
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const fetchDdayData = useCallback(async () => {
    try {
      const response = await fetch('/api/progress/dday')
      if (!response.ok) throw new Error('Failed to fetch D-day data')
      const data = await response.json()
      setDdayData(data)
    } catch (err) {
      console.error('Error fetching D-day data:', err)
      setError('Failed to load D-day progress')
    }
  }, [])

  const fetchMonthlyData = useCallback(async (year: number, month: number) => {
    try {
      const response = await fetch(`/api/progress/monthly?year=${year}&month=${month}`)
      if (!response.ok) throw new Error('Failed to fetch monthly data')
      const data = await response.json()
      setMonthlyData(data)
    } catch (err) {
      console.error('Error fetching monthly data:', err)
      setError('Failed to load monthly progress')
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    if (viewMode === 'dday') {
      await fetchDdayData()
    } else {
      await fetchMonthlyData(currentYear, currentMonth)
    }
    
    setLoading(false)
  }, [viewMode, currentYear, currentMonth, fetchDdayData, fetchMonthlyData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-accent rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-accent rounded"></div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-center text-text-secondary">{error}</p>
      </Card>
    )
  }

  const renderDdayView = () => {
    if (!ddayData || !ddayData.hasData) {
      return <p className="text-center text-text-secondary">No D-day data available</p>
    }

    // Calculate the ideal progress line
    const totalDays = ddayData.daysElapsed + ddayData.daysRemaining
    const totalGoalMinutes = 120000 // 2000 hours default
    const dailyGoal = totalGoalMinutes / totalDays

    // Create chart data with cumulative progress
    let cumulativeMinutes = 0
    let daysSinceStart = 0
    const startDate = new Date(ddayData.startDate)
    startDate.setHours(0, 0, 0, 0)
    
    const chartData = ddayData.dailyProgress.map((day) => {
      cumulativeMinutes += day.minutes
      
      // Calculate target based on days since D-day start
      const currentDate = new Date(day.date)
      currentDate.setHours(0, 0, 0, 0)
      
      let target = 0
      if (currentDate >= startDate) {
        daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        target = Math.floor(daysSinceStart * dailyGoal)
      }
      
      return {
        date: day.date,
        actual: Math.floor(cumulativeMinutes),
        target
      }
    })

    // Add remaining days with projected target
    const lastDate = ddayData.dailyProgress.length > 0 
      ? new Date(ddayData.dailyProgress[ddayData.dailyProgress.length - 1].date)
      : new Date(ddayData.startDate)
    
    const endDate = new Date(ddayData.endDate)
    const today = new Date()
    
    // Fill in missing days up to today or end date (whichever is earlier)
    const fillUntil = today < endDate ? today : endDate
    const currentDate = new Date(lastDate)
    currentDate.setDate(currentDate.getDate() + 1)
    
    while (currentDate <= fillUntil) {
      currentDate.setHours(0, 0, 0, 0)
      
      let target = 0
      if (currentDate >= startDate) {
        const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        target = Math.floor(daysSinceStart * dailyGoal)
      }
      
      chartData.push({
        date: currentDate.toISOString().split('T')[0],
        actual: Math.floor(cumulativeMinutes),
        target
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return (
      <div>
        <div className="mb-4 flex justify-between items-center">
          <div>
            <p className="text-body-sm text-text-secondary">
              Progress: {Math.floor(cumulativeMinutes)} / {totalGoalMinutes} minutes
            </p>
            <p className="text-caption text-text-secondary">
              {ddayData.daysElapsed} days elapsed, {ddayData.daysRemaining} days remaining
            </p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4DCC9" />
              <XAxis 
                dataKey="date" 
                stroke="#5D737E"
                tick={{ fill: '#5D737E', fontSize: 12 }}
                tickFormatter={(value) => format(parseISO(value), 'MMM d')}
              />
              <YAxis 
                stroke="#5D737E"
                tick={{ fill: '#5D737E', fontSize: 12 }}
                tickFormatter={(value) => `${Math.floor(value / 60)}h`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#F9F5ED', 
                  border: '1px solid #E4DCC9',
                  borderRadius: '4px'
                }}
                formatter={(value: number) => [`${Math.floor(value)} min`, '']}
                labelFormatter={(label) => format(parseISO(label as string), 'MMM d, yyyy')}
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="#9CA3AF" 
                strokeWidth={2}
                dot={false}
                name="Target"
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#4A7C7E" 
                strokeWidth={3}
                dot={false}
                name="Actual"
              />
              <ReferenceLine 
                x={today.toISOString().split('T')[0]} 
                stroke="#D63230"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{ value: "Today", position: "top" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  const renderMonthlyView = () => {
    if (!monthlyData || !monthlyData.hasData) {
      return <p className="text-center text-text-secondary">No monthly data available</p>
    }

    // Create chart data with target line
    const chartData = monthlyData.dailyProgress.map((day, index) => {
      const daysSinceStart = index + 1
      const targetMinutes = monthlyData.carryOverMinutes + (daysSinceStart * monthlyData.dailyGoal)
      return {
        date: day.date,
        actual: day.minutes,
        target: Math.floor(targetMinutes)
      }
    })

    const monthName = format(new Date(monthlyData.year, monthlyData.month - 1), 'MMMM yyyy')

    return (
      <div>
        <div className="mb-4 flex justify-between items-center">
          <div>
            <p className="text-body-sm text-text-secondary">
              {monthName} Progress
            </p>
            <p className="text-caption text-text-secondary">
              Carried over: {Math.floor(monthlyData.carryOverMinutes)} min | 
              This month: {Math.floor(monthlyData.totalMinutes)} min | 
              Daily goal: {Math.floor(monthlyData.dailyGoal)} min
            </p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4DCC9" />
              <XAxis 
                dataKey="date" 
                stroke="#5D737E"
                tick={{ fill: '#5D737E', fontSize: 12 }}
                tickFormatter={(value) => format(parseISO(value), 'd')}
              />
              <YAxis 
                stroke="#5D737E"
                tick={{ fill: '#5D737E', fontSize: 12 }}
                tickFormatter={(value) => `${Math.floor(value / 60)}h`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#F9F5ED', 
                  border: '1px solid #E4DCC9',
                  borderRadius: '4px'
                }}
                formatter={(value: number) => [`${Math.floor(value)} min`, '']}
                labelFormatter={(label) => format(parseISO(label as string), 'MMM d, yyyy')}
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="#9CA3AF" 
                strokeWidth={2}
                dot={false}
                name="Target"
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#4A7C7E" 
                strokeWidth={3}
                dot={false}
                name="Actual"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-sans text-heading-lg text-text-primary">D-day Progress</h3>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'dday' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('dday')}
          >
            D-day
          </Button>
          <Button
            variant={viewMode === 'monthly' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('monthly')}
          >
            Monthly
          </Button>
        </div>
      </div>
      
      {viewMode === 'dday' ? renderDdayView() : renderMonthlyView()}
    </Card>
  )
}