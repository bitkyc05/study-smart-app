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
  
  // 페이지 종료 시 세션 중단 처리
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const currentSessionId = usePomodoroStore.getState().currentSessionId
      const currentState = usePomodoroStore.getState().state
      
      // 진행 중인 세션이 있을 때만 처리
      if (currentSessionId && (currentState === 'countdown' || currentState === 'paused')) {
        // keepalive 옵션을 사용하여 페이지 종료 시에도 요청 전송
        fetch('/api/sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
            status: 'interrupted'
          }),
          keepalive: true
        }).catch(() => {
          // 에러 무시 (페이지가 종료되는 중이므로)
        })
        
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
        // 휴식 중에는 정지 버튼만 표시
        if (sessionType === 'break') {
          return (
            <Button 
              onClick={stop}
              variant="primary"
              className="flex items-center gap-2"
              size="lg"
            >
              정지
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
        {/* 시간 설정 - idle 상태일 때만 표시 */}
        {state === 'idle' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-body-md text-text-primary">학습 시간</label>
              <select
                value={settings.studyDuration}
                onChange={(e) => updateSettings({ studyDuration: Number(e.target.value) })}
                className="px-4 py-2 border border-accent rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-focus"
              >
                <option value={10}>10초 (테스트)</option>
                <option value={900}>15분</option>
                <option value={1200}>20분</option>
                <option value={1500}>25분</option>
                <option value={1800}>30분</option>
                <option value={2700}>45분</option>
                <option value={3600}>60분</option>
              </select>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-body-md text-text-primary">휴식 시간</label>
              <select
                value={settings.shortBreakDuration}
                onChange={(e) => updateSettings({ shortBreakDuration: Number(e.target.value) })}
                className="px-4 py-2 border border-accent rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-focus"
              >
                <option value={10}>10초 (테스트)</option>
                <option value={300}>5분</option>
                <option value={600}>10분</option>
                <option value={900}>15분</option>
                <option value={1200}>20분</option>
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
        
        {/* 세션 타입 표시 */}
        {state === 'idle' && subjectId === null && (
          <div className="text-center text-sm text-text-secondary">
            기타(Etc)로 공부 시간이 기록됩니다
          </div>
        )}
      </div>
    </Card>
  )
}