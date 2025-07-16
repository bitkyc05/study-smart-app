'use client'

import { usePomodoroStore } from '@/store/usePomodoroStore'
import { useEffect, useRef } from 'react'

interface CircularTimerProps {
  size?: number
  strokeWidth?: number
}

export function CircularTimer({ size = 320, strokeWidth = 12 }: CircularTimerProps) {
  const { 
    state, 
    dialAngle, 
    completedRings,
    sessionType
  } = usePomodoroStore()
  
  const { calculateRingProgress } = usePomodoroStore(state => state.actions)
  const animationRef = useRef<number | undefined>(undefined)
  
  // requestAnimationFrame을 이용한 부드러운 애니메이션
  useEffect(() => {
    if (state === 'countdown' || state === 'overtime' || state === 'breakOvertime') {
      const animate = () => {
        // 매 프레임마다 시간 업데이트 (시각적 부드러움을 위해)
        animationRef.current = requestAnimationFrame(animate)
      }
      
      animate()
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    }
  }, [state])
  
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  // 색상 결정
  const getColor = () => {
    if (state === 'overtime' || state === 'breakOvertime') {
      return '#D8A25D' // var(--color-warning)
    }
    return sessionType === 'study' 
      ? '#5D737E' // var(--accent-primary)
      : '#5A8B72' // var(--color-success)
  }
  
  // 실시간 진행 상태 계산
  const ringProgress = calculateRingProgress()
  
  return (
    <div className="relative">
      <svg 
        width={size} 
        height={size} 
        className="transform -rotate-90"
      >
        {/* 배경 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F5F5F0"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        
        {/* 완성된 원들 (60분 초과 시) - 옅은 색으로 표시 */}
        {completedRings > 0 && Array.from({ length: completedRings }).map((_, i) => (
          <circle
            key={`ring-${i}`}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            opacity={0.15 - (i * 0.02)} // 더 옅은 투명도, 겹칠수록 더 옅게
            className="transition-opacity duration-300"
          />
        ))}
        
        {/* 현재 진행 중인 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (dialAngle / 360) * circumference}
          className="transition-all duration-300 ease-linear"
        />
        
        {/* 60분 초과 표시기 */}
        {completedRings > 0 && (
          <text
            x={size / 2}
            y={strokeWidth + 25}
            textAnchor="middle"
            className="text-sm fill-current text-text-secondary font-medium"
            style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
          >
            {completedRings}시간 초과
          </text>
        )}
      </svg>
      
      {/* 중앙 시간 표시 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl font-light text-text-primary tracking-wider">
            {ringProgress.displayTime}
          </div>
          <div className="text-base text-text-secondary mt-2">
            {state === 'overtime' && 'Overtime'}
            {state === 'breakOvertime' && 'Break Overtime'}
            {state === 'countdown' && sessionType === 'study' && 'Focus Time'}
            {state === 'countdown' && sessionType === 'break' && 'Break Time'}
            {state === 'paused' && 'Paused'}
          </div>
          {completedRings > 0 && (
            <div className="text-xs text-text-secondary opacity-70 mt-1">
              집중중
            </div>
          )}
        </div>
      </div>
    </div>
  )
}