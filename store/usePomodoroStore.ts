import { create } from 'zustand'
import type { 
  PomodoroStore, 
  TimerState, 
  WorkerMessage,
  TimerSettings,
  NotificationSettings 
} from '@/types/timer.types'
import { fetchWithOfflineSupport } from '@/lib/utils/offlineQueue'

const DEFAULT_SETTINGS: TimerSettings = {
  studyDuration: 25 * 60,      // 25분
  shortBreakDuration: 5 * 60,   // 5분
  autoStartBreaks: false,
  autoStartPomodoros: false,
  autoStartBreakOnStudyStop: false,
  autoStartStudyOnBreakStop: false,
  notificationsEnabled: true,
  availableStudyDurations: [15 * 60, 20 * 60, 25 * 60, 30 * 60, 45 * 60], // 기본 학습 시간 옵션들
  availableBreakDurations: [5 * 60, 10 * 60, 15 * 60, 20 * 60] // 기본 휴식 시간 옵션들
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  sound: true,
  desktop: true,
  completionMessage: 'Time is up!',
  breakMessage: 'Time for a break!'
}

export const usePomodoroStore = create<PomodoroStore>()((set, get) => ({
    // Initial state
    state: 'idle' as TimerState,
    sessionType: 'study',
    subjectId: null,
    currentSessionId: null,
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
      startStudy: async (subjectId) => {
        const { state, workerRef, settings } = get()
        if (state !== 'idle') return
        
        // 세션 생성을 제거하고 시작 시간만 저장
        const startTime = Date.now()
        
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
          currentRingAngle: initialAngle,
          sessionStartTime: startTime // 시작 시간 저장
        })
        
        workerRef?.postMessage({
          command: 'start',
          duration: settings.studyDuration,
          sessionType: 'study'
        })
      },

      startBreak: async () => {
        const { state, workerRef, settings } = get()
        if (state !== 'idle') return
        
        const breakDuration = settings.shortBreakDuration // TODO: 긴 휴식 로직 추가
        
        // 세션 생성
        try {
          const response = await fetchWithOfflineSupport('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionType: 'short_break',
              status: 'in_progress',
              settingDuration: breakDuration
            }),
            offlineQueueType: 'session'
          })

          if (response && response.ok) {
            const { data } = await response.json()
            set({ currentSessionId: data.id })
          } else if (!response) {
            // 오프라인 큐에 추가됨 - 임시 ID 생성
            const tempId = `offline-${Date.now()}`
            set({ currentSessionId: tempId })
            console.log('Break session creation queued for offline sync')
          } else {
            console.error('Failed to create break session')
          }
        } catch (error) {
          console.error('Error creating break session:', error)
        }
        
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
        const { workerRef, settings, sessionType, state } = get()
        
        // 세션 생성 전이므로 아무 처리도 하지 않음
        // 설정시간 전에 종료하면 세션이 기록되지 않음
        
        // 학습 세션 중단 시 자동으로 휴식 시작 옵션 확인
        const shouldAutoStartBreak = sessionType === 'study' && 
                                    (state === 'countdown' || state === 'paused') && 
                                    settings.autoStartBreakOnStudyStop
        
        if (shouldAutoStartBreak) {
          // 휴식 자동 시작
          get().actions.startBreak()
        } else {
          set({
            state: 'idle',
            timeRemaining: settings.studyDuration,
            overtimeElapsed: 0,
            dialAngle: 0,
            completedRings: 0,
            currentRingAngle: 0,
            currentSessionId: null,
            sessionStartTime: undefined // 시작 시간 초기화
          })
          
          workerRef?.postMessage({ command: 'reset' })
        }
      },
      
      stop: async () => {
        const { state, sessionType, overtimeElapsed, settingDuration, currentSessionId, workerRef, timeRemaining } = get()
        
        // 휴식 중이거나 초과시간 상태일 때만 stop 가능
        if (!(sessionType === 'break' && state === 'countdown') && 
            state !== 'overtime' && 
            state !== 'breakOvertime') return
        
        // 휴식 중이면 경과시간 계산, 초과시간이면 기존 로직
        const totalDuration = sessionType === 'break' && state === 'countdown' 
          ? settingDuration - timeRemaining 
          : settingDuration + overtimeElapsed
        
        // 현재 세션 업데이트
        if (currentSessionId && (typeof currentSessionId === 'number' || !currentSessionId.startsWith('offline-'))) {
          try {
            const response = await fetchWithOfflineSupport('/api/sessions', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: currentSessionId,
                status: 'completed',
                actualDuration: totalDuration,
                overtimeDuration: overtimeElapsed
              }),
              offlineQueueType: 'session'
            })

            if (response && response.ok) {
              // 성공 알림
              if (get().notificationSettings.desktop && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('세션 저장 완료', {
                  body: `${Math.floor(totalDuration / 60)}분 학습 기록이 저장되었습니다.`,
                  icon: '/favicon.ico'
                })
              }
            } else if (!response) {
              // 오프라인 큐에 추가됨
              console.log('Session completion queued for offline sync')
              if (get().notificationSettings.desktop && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('세션 저장 대기 중', {
                  body: `오프라인 상태입니다. ${Math.floor(totalDuration / 60)}분 학습 기록이 나중에 동기화됩니다.`,
                  icon: '/favicon.ico'
                })
              }
            } else {
              console.error('Failed to update session')
            }
          } catch (error) {
            console.error('Error updating session:', error)
          }
        }
        
        const { settings } = get()
        
        // 휴식 세션 중단 시 자동으로 학습 시작 옵션 확인
        const shouldAutoStartStudy = sessionType === 'break' && 
                                    state === 'countdown' && 
                                    settings.autoStartStudyOnBreakStop
        
        if (shouldAutoStartStudy) {
          // 학습 자동 시작 (기존 subject ID 유지)
          const currentSubjectId = get().subjectId
          get().actions.startStudy(currentSubjectId)
        } else {
          const initialDuration = sessionType === 'study' ? settings.studyDuration : settings.shortBreakDuration
          const initialAngle = (initialDuration / 3600) * 360
          
          set({
            state: 'idle',
            timeRemaining: initialDuration,
            overtimeElapsed: 0,
            dialAngle: initialAngle,
            completedRings: 0,
            currentRingAngle: initialAngle,
            currentSessionId: null
          })
          
          workerRef?.postMessage({ command: 'stop' })
        }
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
            const currentState = get()
            
            // 학습 세션인 경우에만 세션을 생성
            if (currentState.sessionType === 'study' && currentState.sessionStartTime) {
              const duration = currentState.settingDuration
              const startedAt = new Date(currentState.sessionStartTime).toISOString()
              
              // 세션 생성
              fetchWithOfflineSupport('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subjectId: currentState.subjectId,
                  sessionType: 'study',
                  duration,
                  settingDuration: duration,
                  startedAt,
                  status: 'completed'
                }),
                offlineQueueType: 'session'
              }).then(async (response) => {
                if (response && response.ok) {
                  const { data } = await response.json()
                  set({ currentSessionId: data.id })
                } else if (!response) {
                  // 오프라인 큐에 추가됨
                  const tempId = `offline-${Date.now()}`
                  set({ currentSessionId: tempId })
                  console.log('Session creation queued for offline sync')
                }
              }).catch(error => {
                console.error('Error creating session:', error)
              })
            }
            
            set({ 
              state: get().sessionType === 'study' ? 'overtime' : 'breakOvertime'
            })
            
            // 알림 표시
            if (get().notificationSettings.desktop && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('Time Exceeded', {
                body: 'The set time has been exceeded. Overtime will be recorded.',
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
        
        if (state === 'idle') {
          // idle 상태에서도 시간이 60분 이상일 때 완성된 원 표시
          const completedRings = Math.floor(settingDuration / baseUnit)
          const remainingSeconds = settingDuration % baseUnit
          const angle = (remainingSeconds / baseUnit) * 360
          
          set({ 
            dialAngle: angle,
            completedRings: completedRings,
            currentRingAngle: angle
          })
        } else if (state === 'countdown' || state === 'paused') {
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
          // 초과시간: 0° → 360° (채우기 - 시계방향)
          const overtimeRings = Math.floor(overtimeElapsed / baseUnit)
          const currentOvertimeInRing = overtimeElapsed % baseUnit
          const angle = (currentOvertimeInRing / baseUnit) * 360
          
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
          // Next.js에서 Worker를 정적 분석 가능하게 만들기 위한 방법
          const workerUrl = new URL('/pomodoro-worker.js', window.location.origin).href
          const worker = new Worker(workerUrl)
          
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
          
          set({ 
            settingDuration: duration,
            timeRemaining: duration
          })
          
          // updateDialAngle 호출하여 올바른 원과 각도 계산
          get().actions.updateDialAngle()
        }
      },

      // 진행 중인 세션 복구
      recoverSession: async () => {
        try {
          const response = await fetch('/api/sessions?status=in_progress&limit=1')
          if (response.ok) {
            const { data } = await response.json()
            if (data && data.length > 0) {
              const session = data[0]
              
              // 세션이 24시간 이상 지났으면 중단 처리
              const startTime = new Date(session.started_at).getTime()
              const now = Date.now()
              const elapsed = (now - startTime) / 1000 // 초 단위
              
              if (elapsed > 24 * 60 * 60) {
                // 24시간 초과, 세션 중단 처리
                await fetchWithOfflineSupport('/api/sessions', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: session.id,
                    status: 'interrupted'
                  }),
                  offlineQueueType: 'session'
                })
                return
              }
              
              // 세션 복구
              const remainingTime = session.planned_duration_seconds - Math.min(elapsed, session.planned_duration_seconds)
              
              set({
                currentSessionId: session.id,
                sessionType: session.session_type === 'study' ? 'study' : 'break',
                subjectId: session.subject_id,
                settingDuration: session.planned_duration_seconds,
                timeRemaining: Math.max(0, remainingTime),
                state: remainingTime > 0 ? 'paused' : 'idle'
              })
              
              // 남은 시간이 있으면 일시정지 상태로 표시
              if (remainingTime > 0) {
                const angle = (remainingTime / 3600) * 360
                set({ 
                  dialAngle: angle,
                  currentRingAngle: angle
                })
                
                // 사용자에게 복구 알림
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('진행 중인 세션 발견', {
                    body: '이전에 진행 중이던 세션이 복구되었습니다.',
                    icon: '/favicon.ico'
                  })
                }
              }
            }
          }
        } catch (error) {
          console.error('Error recovering session:', error)
        }
      }
    }
  }))