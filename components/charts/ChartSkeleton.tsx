'use client'

import React from 'react'

interface ChartSkeletonProps {
  height?: number | string
  className?: string
  type?: 'bar' | 'line' | 'area' | 'pie'
}

export function ChartSkeleton({ 
  height = 300, 
  className = '',
  type = 'bar' 
}: ChartSkeletonProps) {
  return (
    <div 
      className={`bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse ${className}`}
      style={{ height }}
    >
      <div className="p-4 h-full flex flex-col">
        {/* Title skeleton */}
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
        
        {/* Chart area */}
        <div className="flex-1 flex items-end justify-between gap-2 px-8">
          {type === 'bar' && (
            <>
              {[0.7, 0.5, 0.9, 0.3, 0.6, 0.8, 0.4].map((scale, index) => (
                <div 
                  key={index}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t"
                  style={{ height: `${scale * 100}%` }}
                ></div>
              ))}
            </>
          )}
          
          {type === 'line' && (
            <div className="w-full h-full relative">
              <svg className="w-full h-full">
                <path
                  d="M 0 150 Q 50 100 100 120 T 200 80 T 300 100 T 400 60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-gray-200 dark:text-gray-700"
                />
              </svg>
            </div>
          )}
          
          {type === 'area' && (
            <div className="w-full h-full relative">
              <svg className="w-full h-full">
                <path
                  d="M 0 150 Q 50 100 100 120 T 200 80 T 300 100 T 400 60 L 400 200 L 0 200 Z"
                  fill="currentColor"
                  className="text-gray-200 dark:text-gray-700 opacity-50"
                />
              </svg>
            </div>
          )}
          
          {type === 'pie' && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-48 h-48 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            </div>
          )}
        </div>
        
        {/* X-axis labels skeleton */}
        {type !== 'pie' && (
          <div className="flex justify-between mt-4 px-8">
            {[1, 2, 3, 4, 5, 6, 7].map((_, index) => (
              <div 
                key={index}
                className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-8"
              ></div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 여러 차트를 위한 스켈레톤 그리드
export function ChartSkeletonGrid({ 
  count = 4,
  className = '' 
}: { 
  count?: number
  className?: string 
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <ChartSkeleton 
          key={index} 
          type={['bar', 'line', 'area', 'pie'][index % 4] as any}
        />
      ))}
    </div>
  )
}