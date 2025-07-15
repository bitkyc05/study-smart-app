'use client'

import React from 'react'
import { TooltipProps } from 'recharts'

interface ChartTooltipProps extends TooltipProps<number, string> {
  active?: boolean
  payload?: Array<{
    value: number
    name?: string
    color?: string
  }>
  label?: string
  formatValue?: (value: number) => string
  valueUnit?: string
  showLabel?: boolean
  customFormatter?: (value: number, name: string) => React.ReactNode
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatValue = (value) => value.toLocaleString(),
  valueUnit = '',
  showLabel = true,
  customFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {showLabel && label && (
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const value = entry.value as number
          const displayValue = customFormatter 
            ? customFormatter(value, entry.name || '')
            : `${formatValue(value)}${valueUnit}`

          return (
            <div key={`item-${index}`} className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {entry.name}:
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {displayValue}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 시간 포맷팅을 위한 헬퍼 함수
export function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) {
    return `${mins}분`
  } else if (mins === 0) {
    return `${hours}시간`
  } else {
    return `${hours}시간 ${mins}분`
  }
}

// 날짜 포맷팅을 위한 헬퍼 함수
export function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  
  return `${month}/${day} (${weekday})`
}