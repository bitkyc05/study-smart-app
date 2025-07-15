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
  const { state, settings, sessionType } = usePomodoroStore()
  const { 
    startStudy, 
    startBreak, 
    pause, 
    resume, 
    reset, 
    stop,
    initializeWorker,
    updateSettings,
    recoverSession 
  } = usePomodoroStore(state => state.actions)
  
  // Worker 초기화 및 세션 복구
  useEffect(() => {
    initializeWorker()
    recoverSession()
  }, [initializeWorker, recoverSession])
  
  // 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])
  
  // 페이지 종료 시 경고만 표시 (세션은 저장하지 않음)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const currentState = usePomodoroStore.getState().state
      const sessionType = usePomodoroStore.getState().sessionType
      
      // 학습 세션이 진행 중일 때만 경고
      if (sessionType === 'study' && (currentState === 'countdown' || currentState === 'paused')) {
        // 일부 브라우저에서 확인 대화상자 표시
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
  
  // 버튼 표시 로직 (State Machine에 따라)
  const getButtons = () => {
    switch (state) {
      case 'idle':
        return (
          <>
            <Button 
              onClick={() => startStudy(subjectId || null)}
              className="flex items-center gap-2"
              size="lg"
            >
              Start Study
            </Button>
            <Button 
              onClick={startBreak}
              variant="secondary"
              className="flex items-center gap-2"
              size="lg"
            >
              Start Break
            </Button>
          </>
        )
      
      case 'countdown':
        // 휴식 중에는 정지 버튼만 표시
        if (sessionType === 'break') {
          return (
            <Button 
              onClick={stop}
              variant="primary"
              className="flex items-center gap-2"
              size="lg"
            >
              Stop
            </Button>
          )
        }
        // 공부 중에는 일시정지와 리셋 버튼 표시
        return (
          <>
            <Button 
              onClick={pause}
              variant="secondary"
              className="flex items-center gap-2"
              size="lg"
            >
              Pause
            </Button>
            <Button 
              onClick={reset}
              variant="ghost"
              className="flex items-center gap-2"
              size="lg"
            >
              Reset
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
              Resume
            </Button>
            <Button 
              onClick={reset}
              variant="ghost"
              className="flex items-center gap-2"
              size="lg"
            >
              Reset
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
            Stop (Save Overtime)
          </Button>
        )
      
      default:
        return null
    }
  }

  return (
    <Card className="max-w-md mx-auto p-8">
      <div className="space-y-8">
        {/* 시간 설정 - idle 상태일 때만 표시 */}
        {state === 'idle' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-body-md text-text-primary">Study Duration</label>
              <select
                value={settings.studyDuration}
                onChange={(e) => updateSettings({ studyDuration: Number(e.target.value) })}
                className="px-4 py-2 border border-accent rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-focus"
              >
                <option value={10}>10s (Test)</option>
                <option value={900}>15 min</option>
                <option value={1200}>20 min</option>
                <option value={1500}>25 min</option>
                <option value={1800}>30 min</option>
                <option value={2700}>45 min</option>
                <option value={3600}>60 min</option>
              </select>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-body-md text-text-primary">Break Duration</label>
              <select
                value={settings.shortBreakDuration}
                onChange={(e) => updateSettings({ shortBreakDuration: Number(e.target.value) })}
                className="px-4 py-2 border border-accent rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-focus"
              >
                <option value={10}>10s (Test)</option>
                <option value={300}>5 min</option>
                <option value={600}>10 min</option>
                <option value={900}>15 min</option>
                <option value={1200}>20 min</option>
              </select>
            </div>
          </div>
        )}
        
        {/* 원형 타이머 */}
        <div className="flex justify-center">
          <CircularTimer />
        </div>
        
        {/* 컨트롤 버튼 */}
        <div className="flex justify-center gap-4">
          {getButtons()}
        </div>
        
        {/* 세션 타입 표시 - 이제 과목이 항상 선택되므로 메시지 제거 */}
      </div>
    </Card>
  )
}