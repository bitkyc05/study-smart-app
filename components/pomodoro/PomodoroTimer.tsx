'use client'

import { useEffect } from 'react'
import { usePomodoroStore } from '@/store/usePomodoroStore'
import { CircularTimer } from './CircularTimer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface PomodoroTimerProps {
  subjectId?: string | null
}

export function PomodoroTimer({ subjectId }: PomodoroTimerProps) {
  const { state } = usePomodoroStore()
  const { 
    startStudy, 
    startBreak, 
    pause, 
    resume, 
    reset, 
    stop,
    initializeWorker 
  } = usePomodoroStore(state => state.actions)
  
  // Worker 초기화
  useEffect(() => {
    initializeWorker()
  }, [initializeWorker])
  
  // 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])
  
  // 버튼 표시 로직 (State Machine에 따라)
  const getButtons = () => {
    switch (state) {
      case 'idle':
        return (
          <>
            <Button 
              onClick={() => startStudy(subjectId || 'default')}
              disabled={!subjectId}
              className="flex items-center gap-2"
              size="lg"
            >
              공부 시작
            </Button>
            <Button 
              onClick={startBreak}
              variant="secondary"
              className="flex items-center gap-2"
              size="lg"
            >
              휴식 시작
            </Button>
          </>
        )
      
      case 'countdown':
        return (
          <>
            <Button 
              onClick={pause}
              variant="secondary"
              className="flex items-center gap-2"
              size="lg"
            >
              일시정지
            </Button>
            <Button 
              onClick={reset}
              variant="ghost"
              className="flex items-center gap-2"
              size="lg"
            >
              리셋
            </Button>
          </>
        )
      
      case 'paused':
        return (
          <>
            <Button 
              onClick={resume}
              className="flex items-center gap-2"
              size="lg"
            >
              재개
            </Button>
            <Button 
              onClick={reset}
              variant="ghost"
              className="flex items-center gap-2"
              size="lg"
            >
              리셋
            </Button>
          </>
        )
      
      case 'overtime':
      case 'breakOvertime':
        return (
          <Button 
            onClick={stop}
            variant="primary"
            className="flex items-center gap-2 bg-warning hover:bg-warning-dark"
            size="lg"
          >
            정지 (초과시간 저장)
          </Button>
        )
      
      default:
        return null
    }
  }

  return (
    <Card className="max-w-md mx-auto p-8">
      <div className="space-y-8">
        {/* 원형 타이머 */}
        <div className="flex justify-center">
          <CircularTimer />
        </div>
        
        {/* 컨트롤 버튼 */}
        <div className="flex justify-center gap-4">
          {getButtons()}
        </div>
        
        {/* 세션 타입 표시 */}
        {state === 'idle' && (
          <div className="text-center text-sm text-text-secondary">
            {!subjectId && '과목을 선택하면 공부 시간이 기록됩니다'}
          </div>
        )}
      </div>
    </Card>
  )
}