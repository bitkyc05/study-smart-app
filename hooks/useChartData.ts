import { useState, useEffect, useMemo } from 'react'

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
  [key: string]: any
}

export interface UseChartDataOptions {
  // 데이터 변환 옵션
  dateFormat?: 'daily' | 'weekly' | 'monthly'
  aggregation?: 'sum' | 'average' | 'max' | 'min'
  fillMissingDates?: boolean
  sortOrder?: 'asc' | 'desc'
  
  // 필터링 옵션
  startDate?: Date
  endDate?: Date
  limit?: number
}

export function useChartData<T extends Record<string, any>>(
  data: T[] | undefined,
  options: UseChartDataOptions = {}
) {
  const {
    dateFormat = 'daily',
    aggregation = 'sum',
    fillMissingDates = true,
    sortOrder = 'asc',
    startDate,
    endDate,
    limit
  } = options

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (data !== undefined) {
      setIsLoading(false)
    }
  }, [data])

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []

    try {
      // 날짜 필터링
      let filtered = data
      if (startDate || endDate) {
        filtered = data.filter(item => {
          const itemDate = new Date(item.date || item.created_at)
          if (startDate && itemDate < startDate) return false
          if (endDate && itemDate > endDate) return false
          return true
        })
      }

      // 날짜별 그룹화
      const grouped = groupByDate(filtered, dateFormat)

      // 집계
      const aggregated = aggregate(grouped, aggregation)

      // 누락된 날짜 채우기
      const filled = fillMissingDates ? fillDates(aggregated, dateFormat) : aggregated

      // 정렬
      const sorted = filled.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
      })

      // 제한
      const limited = limit ? sorted.slice(0, limit) : sorted

      return limited
    } catch (err) {
      setError(err as Error)
      return []
    }
  }, [data, dateFormat, aggregation, fillMissingDates, sortOrder, startDate, endDate, limit])

  return {
    data: processedData,
    isLoading,
    error,
    isEmpty: processedData.length === 0
  }
}

// 날짜별 그룹화 함수
function groupByDate<T extends Record<string, any>>(
  data: T[],
  format: 'daily' | 'weekly' | 'monthly'
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()

  data.forEach(item => {
    const date = new Date(item.date || item.created_at)
    let key: string

    switch (format) {
      case 'daily':
        key = date.toISOString().split('T')[0]
        break
      case 'weekly':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
        break
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
    }

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(item)
  })

  return grouped
}

// 집계 함수
function aggregate<T extends Record<string, any>>(
  grouped: Map<string, T[]>,
  method: 'sum' | 'average' | 'max' | 'min'
): ChartDataPoint[] {
  const result: ChartDataPoint[] = []

  grouped.forEach((items, date) => {
    const values = items.map(item => 
      item.value || item.duration_seconds || item.duration || 0
    )

    let value: number
    switch (method) {
      case 'sum':
        value = values.reduce((acc, val) => acc + val, 0)
        break
      case 'average':
        value = values.reduce((acc, val) => acc + val, 0) / values.length
        break
      case 'max':
        value = Math.max(...values)
        break
      case 'min':
        value = Math.min(...values)
        break
    }

    result.push({ date, value })
  })

  return result
}

// 누락된 날짜 채우기
function fillDates(
  data: ChartDataPoint[],
  format: 'daily' | 'weekly' | 'monthly'
): ChartDataPoint[] {
  if (data.length === 0) return data

  const dates = data.map(d => new Date(d.date))
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
  
  const filled: ChartDataPoint[] = []
  const dataMap = new Map(data.map(d => [d.date, d]))

  const current = new Date(minDate)
  while (current <= maxDate) {
    let key: string

    switch (format) {
      case 'daily':
        key = current.toISOString().split('T')[0]
        current.setDate(current.getDate() + 1)
        break
      case 'weekly':
        key = current.toISOString().split('T')[0]
        current.setDate(current.getDate() + 7)
        break
      case 'monthly':
        key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
        current.setMonth(current.getMonth() + 1)
        break
    }

    filled.push(dataMap.get(key) || { date: key, value: 0 })
  }

  return filled
}

// 차트 데이터를 특정 필드로 그룹화
export function useGroupedChartData<T extends Record<string, any>>(
  data: T[] | undefined,
  groupBy: keyof T,
  options: UseChartDataOptions = {}
) {
  const processedData = useChartData(data, options)

  const groupedData = useMemo(() => {
    if (!processedData.data) return new Map()

    const grouped = new Map<string, ChartDataPoint[]>()
    
    data?.forEach(item => {
      const key = String(item[groupBy])
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      
      const chartPoint: ChartDataPoint = {
        date: item.date || item.created_at,
        value: item.value || item.duration_seconds || item.duration || 0,
        ...item
      }
      
      grouped.get(key)!.push(chartPoint)
    })

    return grouped
  }, [data, groupBy, processedData])

  return {
    ...processedData,
    groupedData
  }
}