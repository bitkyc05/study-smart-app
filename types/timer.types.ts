// State Machine 기반 타이머 타입 정의

export type TimerState = 
  | 'idle'
  | 'countdown' 
  | 'paused'
  | 'overtime'
  | 'breakOvertime'

export type SessionType = 'study' | 'break'

export interface TimerContext {
  state: TimerState
  sessionType: SessionType
  subjectId: string | null
  
  // Time values (seconds)
  settingDuration: number        // 설정된 시간
  timeRemaining: number          // 남은 시간
  overtimeElapsed: number        // 초과 경과 시간
  
  // Animation values
  dialAngle: number              // 0-360 다이얼 각도
  dialDirection: 'cw' | 'ccw'   // 시계방향/반시계방향
  lastRenderTick: number         // 마지막 렌더링 시간
  
  // Multi-layer rendering for >60min
  completedRings: number         // 완성된 60분 원 개수
  currentRingAngle: number       // 현재 진행 중인 원의 각도
}

// Worker Message Types
export interface WorkerMessage {
  type: 'tick' | 'started' | 'paused' | 'resumed' | 'overtime_started' | 'overtime_tick' | 'reset' | 'status' | 'stopped'
  data?: WorkerMessageData
}

export interface WorkerMessageData {
  timeRemaining?: number
  overtimeElapsed?: number
  sessionType?: SessionType
  status?: string
  totalDuration?: number
}

export interface WorkerCommand {
  command: 'start' | 'pause' | 'resume' | 'reset' | 'stop' | 'get_status'
  duration?: number
  sessionType?: SessionType
}

// Timer Settings
export interface TimerSettings {
  studyDuration: number          // 기본 학습 시간 (초)
  shortBreakDuration: number     // 짧은 휴식 시간 (초)
  longBreakDuration: number      // 긴 휴식 시간 (초)
  longBreakInterval: number      // 긴 휴식까지의 포모도로 개수
  autoStartBreaks: boolean       // 휴식 자동 시작
  autoStartPomodoros: boolean    // 포모도로 자동 시작
  notificationsEnabled: boolean  // 알림 활성화
}

// Notification Settings
export interface NotificationSettings {
  sound: boolean
  desktop: boolean
  completionMessage: string
  breakMessage: string
}

// Session Record
export interface SessionRecord {
  id: string
  userId: string
  subjectId: string | null
  sessionType: SessionType
  duration: number               // 총 시간 (초)
  settingDuration: number        // 설정 시간 (초)
  overtimeElapsed: number        // 초과 시간 (초)
  startedAt: Date
  completedAt: Date
}

// Store Action Types
export interface PomodoroActions {
  // User actions (State transitions)
  startStudy: (subjectId: string) => void
  startBreak: () => void
  pause: () => void
  resume: () => void
  reset: () => void              // 세션 저장 없이 Idle로
  stop: () => void               // 초과시간 포함 저장
  
  // Worker communication
  initializeWorker: () => void
  handleWorkerMessage: (message: WorkerMessage) => void
  updateDialAngle: () => void
  
  // 60분 초과 처리
  calculateRingProgress: () => { 
    completedRings: number
    currentAngle: number 
    displayTime: string
  }
  
  // Settings
  updateSettings: (settings: Partial<TimerSettings>) => void
}

// Full Store Type
export interface PomodoroStore extends TimerContext {
  workerRef: Worker | null
  settings: TimerSettings
  notificationSettings: NotificationSettings
  actions: PomodoroActions
}