'use client'

import React from 'react'
import { ResponsiveContainer } from 'recharts'

interface ChartContainerProps {
  children: React.ReactNode
  height?: number | string
  width?: string | number
  minHeight?: number
  className?: string
  aspect?: number
}

export function ChartContainer({
  children,
  height = 300,
  width = '100%',
  minHeight = 200,
  className = '',
  aspect,
}: ChartContainerProps) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer 
        width={width} 
        height={height}
        minHeight={minHeight}
        aspect={aspect}
      >
        {children}
      </ResponsiveContainer>
    </div>
  )
}