import { create } from 'zustand'
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

export const usePomodoroStore = create<PomodoroStore>()((set, get) => ({
    // Initial state
    state: 'idle' as TimerState,
    sessionType: 'study',
    subjectId: null,
    settingDuration: DEFAULT_SETTINGS.studyDuration,
    timeRemaining: DEFAULT_SETTINGS.studyDuration,
    overtimeElapsed: 0,
    dialAngle: (DEFAULT_SETTINGS.studyDuration / 3600) * 360, // 초기값도 60분 기준
    dialDirection: 'ccw',
    lastRenderTick: 0,
    completedRings: 0,
    currentRingAngle: (DEFAULT_SETTINGS.studyDuration / 3600) * 360,
    workerRef: null,
    settings: DEFAULT_SETTINGS,
    notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,

    actions: {
      startStudy: (subjectId) => {
        const { state, workerRef, settings } = get()
        if (state !== 'idle') return
        
        const initialAngle = (settings.studyDuration / 3600) * 360 // 60분 기준으로 각도 계산
        
        set({
          state: 'countdown',
          sessionType: 'study',
          subjectId,
          settingDuration: settings.studyDuration,
          timeRemaining: settings.studyDuration,
          overtimeElapsed: 0,
          dialAngle: initialAngle, // 25분이면 150도
          dialDirection: 'ccw',
          completedRings: 0,
          currentRingAngle: initialAngle
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
        
        const initialAngle = (breakDuration / 3600) * 360 // 60분 기준으로 각도 계산
        
        set({
          state: 'countdown',
          sessionType: 'break',
          subjectId: null,
          settingDuration: breakDuration,
          timeRemaining: breakDuration,
          overtimeElapsed: 0,
          dialAngle: initialAngle, // 5분이면 30도
          dialDirection: 'ccw',
          completedRings: 0,
          currentRingAngle: initialAngle
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
        const { state, sessionType, overtimeElapsed, settingDuration, subjectId, workerRef, timeRemaining } = get()
        
        // 휴식 중이거나 초과시간 상태일 때만 stop 가능
        if (!(sessionType === 'break' && state === 'countdown') && 
            state !== 'overtime' && 
            state !== 'breakOvertime') return
        
        // 휴식 중이면 경과시간 계산, 초과시간이면 기존 로직
        const totalDuration = sessionType === 'break' && state === 'countdown' 
          ? settingDuration - timeRemaining 
          : settingDuration + overtimeElapsed
        
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
        
        const { settings } = get()
        const initialDuration = sessionType === 'study' ? settings.studyDuration : settings.shortBreakDuration
        const initialAngle = (initialDuration / 3600) * 360
        
        set({
          state: 'idle',
          timeRemaining: initialDuration,
          overtimeElapsed: 0,
          dialAngle: initialAngle,
          completedRings: 0,
          currentRingAngle: initialAngle
        })
        
        workerRef?.postMessage({ command: 'stop' })
      },
      
      handleWorkerMessage: (message: WorkerMessage) => {
        const { type, data } = message
        
        switch (type) {
          case 'started':
            // Worker 시작 확인 메시지
            console.log('Timer started:', data)
            break
            
          case 'tick':
            if (data?.timeRemaining !== undefined) {
              set({ timeRemaining: data.timeRemaining })
              // 매 tick마다 다이얼 각도 업데이트
              get().actions.updateDialAngle()
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
              // 매 tick마다 다이얼 각도 업데이트
              get().actions.updateDialAngle()
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
          // 카운트다운: 설정시간 각도 → 0° (비우기 - 반시계방향)
          // 60분 원 기준으로 남은 시간의 각도 계산
          const angle = (timeRemaining / baseUnit) * 360
          
          // 60분 초과 처리
          const currentRing = Math.floor((settingDuration - timeRemaining) / baseUnit)
          const remainingInCurrentRing = timeRemaining % baseUnit
          const currentAngle = (remainingInCurrentRing / baseUnit) * 360
          
          set({ 
            dialAngle: angle,
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
        let displaySeconds = 0
        
        if (state === 'idle') {
          // idle 상태에서는 설정된 시간을 표시
          displaySeconds = timeRemaining
        } else if (state === 'countdown' || state === 'paused') {
          totalSeconds = settingDuration - timeRemaining
          displaySeconds = timeRemaining
        } else if (state === 'overtime' || state === 'breakOvertime') {
          totalSeconds = settingDuration + overtimeElapsed
          displaySeconds = overtimeElapsed
        }
        
        const hours = Math.floor(displaySeconds / 3600)
        const minutes = Math.floor((displaySeconds % 3600) / 60)
        const seconds = displaySeconds % 60
        
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
          
          console.log('Worker initialized')
          
          set({ workerRef: worker })
        }
      },

      updateSettings: (newSettings) => {
        const currentSettings = get().settings
        const newSettingsObj = { ...currentSettings, ...newSettings }
        set({ settings: newSettingsObj })
        
        // 현재 idle 상태라면 시간 업데이트
        if (get().state === 'idle') {
          const duration = get().sessionType === 'study' 
            ? newSettingsObj.studyDuration
            : newSettingsObj.shortBreakDuration
          
          const angle = (duration / 3600) * 360 // 60분 기준 각도
          
          set({ 
            settingDuration: duration,
            timeRemaining: duration,
            dialAngle: angle,
            currentRingAngle: angle
          })
        }
      }
    }
  }))