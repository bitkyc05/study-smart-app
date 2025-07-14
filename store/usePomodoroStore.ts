import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { 
  PomodoroStore, 
  TimerState, 
  WorkerMessage,
  TimerSettings,
  NotificationSettings 
} from '@/types/timer.types'

const DEFAULT_SETTINGS: TimerSettings = {
  studyDuration: 25 * 60,      // 25분
  shortBreakDuration: 5 * 60,   // 5분
  longBreakDuration: 15 * 60,   // 15분
  longBreakInterval: 4,         // 4회마다 긴 휴식
  autoStartBreaks: false,
  autoStartPomodoros: false,
  notificationsEnabled: true
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  sound: true,
  desktop: true,
  completionMessage: '시간이 종료되었습니다!',
  breakMessage: '휴식 시간입니다!'
}

export const usePomodoroStore = create<PomodoroStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    state: 'idle' as TimerState,
    sessionType: 'study',
    subjectId: null,
    settingDuration: DEFAULT_SETTINGS.studyDuration,
    timeRemaining: 0,
    overtimeElapsed: 0,
    dialAngle: 0,
    dialDirection: 'ccw',
    lastRenderTick: 0,
    completedRings: 0,
    currentRingAngle: 0,
    workerRef: null,
    settings: DEFAULT_SETTINGS,
    notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,

    actions: {
      startStudy: (subjectId) => {
        const { state, workerRef, settings } = get()
        if (state !== 'idle') return
        
        set({
          state: 'countdown',
          sessionType: 'study',
          subjectId,
          settingDuration: settings.studyDuration,
          timeRemaining: settings.studyDuration,
          overtimeElapsed: 0,
          dialAngle: 0,
          dialDirection: 'ccw',
          completedRings: 0,
          currentRingAngle: 0
        })
        
        workerRef?.postMessage({
          command: 'start',
          duration: settings.studyDuration,
          sessionType: 'study'
        })
      },

      startBreak: () => {
        const { state, workerRef, settings } = get()
        if (state !== 'idle') return
        
        const breakDuration = settings.shortBreakDuration // TODO: 긴 휴식 로직 추가
        
        set({
          state: 'countdown',
          sessionType: 'break',
          subjectId: null,
          settingDuration: breakDuration,
          timeRemaining: breakDuration,
          overtimeElapsed: 0,
          dialAngle: 0,
          dialDirection: 'ccw',
          completedRings: 0,
          currentRingAngle: 0
        })
        
        workerRef?.postMessage({
          command: 'start',
          duration: breakDuration,
          sessionType: 'break'
        })
      },

      pause: () => {
        const { state, workerRef } = get()
        if (state !== 'countdown') return
        
        set({ state: 'paused' })
        workerRef?.postMessage({ command: 'pause' })
      },
      
      resume: () => {
        const { state, workerRef } = get()
        if (state !== 'paused') return
        
        set({ state: 'countdown' })
        workerRef?.postMessage({ command: 'resume' })
      },
      
      reset: () => {
        const { workerRef, settings } = get()
        
        set({
          state: 'idle',
          timeRemaining: settings.studyDuration,
          overtimeElapsed: 0,
          dialAngle: 0,
          completedRings: 0,
          currentRingAngle: 0
        })
        
        workerRef?.postMessage({ command: 'reset' })
      },
      
      stop: async () => {
        const { state, sessionType, overtimeElapsed, settingDuration, subjectId, workerRef } = get()
        if (state !== 'overtime' && state !== 'breakOvertime') return
        
        const totalDuration = settingDuration + overtimeElapsed
        
        // 세션 기록 저장
        try {
          const response = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subjectId,
              sessionType,
              duration: totalDuration,
              settingDuration,
              overtimeElapsed,
              startedAt: new Date(Date.now() - totalDuration * 1000).toISOString()
            })
          })

          if (!response.ok) {
            console.error('Failed to save session')
          } else {
            // 성공 알림
            if (get().notificationSettings.desktop && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('세션 저장 완료', {
                body: `${Math.floor(totalDuration / 60)}분 학습 기록이 저장되었습니다.`,
                icon: '/favicon.ico'
              })
            }
          }
        } catch (error) {
          console.error('Error saving session:', error)
        }
        
        set({
          state: 'idle',
          overtimeElapsed: 0,
          dialAngle: 0,
          completedRings: 0,
          currentRingAngle: 0
        })
        
        workerRef?.postMessage({ command: 'stop' })
      },
      
      handleWorkerMessage: (message: WorkerMessage) => {
        const { type, data } = message
        
        switch (type) {
          case 'tick':
            if (data?.timeRemaining !== undefined) {
              set({ timeRemaining: data.timeRemaining })
              
              // 10초마다 다이얼 각도 업데이트
              if (Date.now() - get().lastRenderTick > 10000) {
                get().actions.updateDialAngle()
                set({ lastRenderTick: Date.now() })
              }
            }
            break
            
          case 'overtime_started':
            set({ 
              state: get().sessionType === 'study' ? 'overtime' : 'breakOvertime',
              dialDirection: 'cw' // 역방향
            })
            
            // 알림 표시
            if (get().notificationSettings.desktop && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('시간 초과', {
                body: '설정된 시간을 초과했습니다. 초과 시간이 기록됩니다.',
                icon: '/favicon.ico'
              })
            }
            break
            
          case 'overtime_tick':
            if (data?.overtimeElapsed !== undefined) {
              set({ overtimeElapsed: data.overtimeElapsed })
              
              if (Date.now() - get().lastRenderTick > 10000) {
                get().actions.updateDialAngle()
                set({ lastRenderTick: Date.now() })
              }
            }
            break

          case 'paused':
            set({ state: 'paused' })
            break

          case 'resumed':
            set({ state: 'countdown' })
            break

          case 'reset':
            set({ state: 'idle' })
            break

          case 'stopped':
            // Worker에서 stop 완료 메시지
            break
        }
      },
      
      updateDialAngle: () => {
        const { state, timeRemaining, settingDuration, overtimeElapsed } = get()
        const baseUnit = 60 * 60 // 60분 기준
        
        if (state === 'countdown' || state === 'paused') {
          // 카운트다운: 0° → 360° (채우기)
          const totalSeconds = Math.min(settingDuration, baseUnit)
          const elapsedSeconds = totalSeconds - Math.min(timeRemaining, baseUnit)
          const angle = (elapsedSeconds / baseUnit) * 360
          
          // 60분 초과 처리
          const currentRing = Math.floor((settingDuration - timeRemaining) / baseUnit)
          const remainingInCurrentRing = (settingDuration - timeRemaining) % baseUnit
          const currentAngle = (remainingInCurrentRing / baseUnit) * 360
          
          set({ 
            dialAngle: settingDuration <= baseUnit ? angle : 360,
            completedRings: currentRing,
            currentRingAngle: currentAngle
          })
        } else if (state === 'overtime' || state === 'breakOvertime') {
          // 초과시간: 360° → 0° (비우기)
          const overtimeRings = Math.floor(overtimeElapsed / baseUnit)
          const currentOvertimeInRing = overtimeElapsed % baseUnit
          const angle = 360 - ((currentOvertimeInRing / baseUnit) * 360)
          
          set({ 
            dialAngle: angle,
            completedRings: Math.floor(settingDuration / baseUnit) + overtimeRings,
            currentRingAngle: angle
          })
        }
      },
      
      calculateRingProgress: () => {
        const { timeRemaining, overtimeElapsed, state, settingDuration } = get()
        const baseUnit = 60 * 60 // 60분
        
        let totalSeconds = 0
        if (state === 'countdown' || state === 'paused') {
          totalSeconds = settingDuration - timeRemaining
        } else if (state === 'overtime' || state === 'breakOvertime') {
          totalSeconds = settingDuration + overtimeElapsed
        }
        
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        
        const displayTime = hours > 0 
          ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          : `${minutes}:${seconds.toString().padStart(2, '0')}`
        
        return {
          completedRings: Math.floor(totalSeconds / baseUnit),
          currentAngle: ((totalSeconds % baseUnit) / baseUnit) * 360,
          displayTime
        }
      },
      
      initializeWorker: () => {
        if (typeof window !== 'undefined' && !get().workerRef) {
          const worker = new Worker('/pomodoro-worker.js')
          
          worker.onmessage = (e) => {
            get().actions.handleWorkerMessage(e.data)
          }
          
          worker.onerror = (error) => {
            console.error('Worker error:', error)
            set({ state: 'idle' })
          }
          
          set({ workerRef: worker })
        }
      },

      updateSettings: (newSettings) => {
        set({ settings: { ...get().settings, ...newSettings } })
        
        // 현재 idle 상태라면 시간 업데이트
        if (get().state === 'idle') {
          const duration = get().sessionType === 'study' 
            ? newSettings.studyDuration || get().settings.studyDuration
            : newSettings.shortBreakDuration || get().settings.shortBreakDuration
          
          set({ 
            settingDuration: duration,
            timeRemaining: duration 
          })
        }
      }
    }
  }))
)