'use client'

import { useEffect, useState } from 'react'
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
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  
  // Worker 초기화 및 세션 복구
  useEffect(() => {
    initializeWorker()
    recoverSession()
    
    // API에서 타이머 설정 로드
    const loadTimerSettings = async () => {
      try {
        const response = await fetch('/api/settings/timer')
        if (response.ok) {
          const apiSettings = await response.json()
          updateSettings(apiSettings)
        }
      } catch (error) {
        console.error('Error loading timer settings:', error)
      }
    }
    
    loadTimerSettings()
    
    // 초기 다이얼 각도 업데이트 (1시간 이상 설정 시 원 표시)
    usePomodoroStore.getState().actions.updateDialAngle()
  }, [initializeWorker, recoverSession, updateSettings])
  
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
        return '' // 최신 브라우저를 위한 반환값
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
  
  // reset 확인 핸들러
  const handleResetConfirm = () => {
    reset()
    setShowResetConfirm(false)
  }

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
            <>
              <Button 
                onClick={stop}
                variant="primary"
                className="flex items-center gap-2"
                size="lg"
              >
                Stop
              </Button>
              <Button 
                onClick={() => setShowResetConfirm(true)}
                variant="ghost"
                className="flex items-center gap-2"
                size="lg"
              >
                Reset
              </Button>
            </>
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
              onClick={() => setShowResetConfirm(true)}
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
              onClick={() => setShowResetConfirm(true)}
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
                disabled={state !== 'idle'}
                className="px-4 py-2 border border-accent rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-focus disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(settings.availableStudyDurations && settings.availableStudyDurations.length > 0 
                  ? settings.availableStudyDurations 
                  : [15 * 60, 20 * 60, 25 * 60, 30 * 60, 45 * 60, 60 * 60, 90 * 60, 120 * 60]
                ).map(duration => (
                  <option key={duration} value={duration}>
                    {duration >= 3600 
                      ? `${Math.floor(duration / 3600)} hour${Math.floor(duration / 3600) > 1 ? 's' : ''}${duration % 3600 !== 0 ? ` ${Math.floor((duration % 3600) / 60)} min` : ''}`
                      : `${Math.floor(duration / 60)} min`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-body-md text-text-primary">Break Duration</label>
              <select
                value={settings.shortBreakDuration}
                onChange={(e) => updateSettings({ shortBreakDuration: Number(e.target.value) })}
                disabled={state !== 'idle'}
                className="px-4 py-2 border border-accent rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-focus disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(settings.availableBreakDurations && settings.availableBreakDurations.length > 0 
                  ? settings.availableBreakDurations 
                  : [5 * 60, 10 * 60, 15 * 60, 20 * 60, 30 * 60]
                ).map(duration => (
                  <option key={duration} value={duration}>
                    {duration >= 3600 
                      ? `${Math.floor(duration / 3600)} hour${Math.floor(duration / 3600) > 1 ? 's' : ''}${duration % 3600 !== 0 ? ` ${Math.floor((duration % 3600) / 60)} min` : ''}`
                      : `${Math.floor(duration / 60)} min`}
                  </option>
                ))}
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
        
        {/* Reset 확인 모달 */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">타이머 초기화</h3>
              <p className="text-text-secondary mb-6">
                현재 진행 중인 타이머가 초기화됩니다.
                계속 진행하시겠습니까?
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setShowResetConfirm(false)}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  onClick={handleResetConfirm}
                >
                  확인
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Card>
  )
}