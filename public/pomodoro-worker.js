// Pomodoro Timer Web Worker
// Timestamp 기반 정확한 시간 추적

let timerState = {
  status: 'idle',
  targetTime: 0,        // 목표 시간 (timestamp)
  startTime: 0,         // 시작 시간 (timestamp)
  pausedAt: 0,          // 일시정지 시점
  pausedDuration: 0,    // 총 일시정지 시간
  overtimeStart: 0,     // 초과시간 시작점
  checkInterval: null,
  sessionType: null
};

// 250ms마다 체크 (더 정확한 타이밍)
const CHECK_INTERVAL = 250;

function calculateRemainingTime() {
  if (timerState.status === 'countdown') {
    const now = Date.now();
    const remaining = Math.max(0, timerState.targetTime - now);
    return Math.floor(remaining / 1000);
  }
  return 0;
}

function calculateOvertimeElapsed() {
  if (timerState.status === 'overtime' || timerState.status === 'breakOvertime') {
    const now = Date.now();
    const elapsed = now - timerState.overtimeStart;
    return Math.floor(elapsed / 1000);
  }
  return 0;
}

self.onmessage = function(e) {
  const { command, duration, sessionType } = e.data;

  switch (command) {
    case 'start':
      // 기존 인터벌 정리
      if (timerState.checkInterval) {
        clearInterval(timerState.checkInterval);
      }
      
      const now = Date.now();
      timerState = {
        status: 'countdown',
        targetTime: now + (duration * 1000),
        startTime: now,
        pausedAt: 0,
        pausedDuration: 0,
        overtimeStart: 0,
        checkInterval: null,
        sessionType: sessionType
      };
      
      // 정기적으로 상태 체크 및 업데이트
      timerState.checkInterval = setInterval(() => {
        const remaining = calculateRemainingTime();
        
        if (remaining > 0) {
          // 카운트다운 진행 중
          self.postMessage({ 
            type: 'tick',
            data: {
              timeRemaining: remaining,
              sessionType: timerState.sessionType,
              status: 'countdown'
            }
          });
        } else if (timerState.status === 'countdown') {
          // 카운트다운 종료 → 초과시간 시작
          timerState.status = sessionType === 'study' ? 'overtime' : 'breakOvertime';
          timerState.overtimeStart = Date.now();
          
          self.postMessage({ 
            type: 'overtime_started',
            data: { 
              sessionType: timerState.sessionType
            }
          });
        } else if (timerState.status === 'overtime' || timerState.status === 'breakOvertime') {
          // 초과시간 진행 중
          const overtimeElapsed = calculateOvertimeElapsed();
          
          self.postMessage({ 
            type: 'overtime_tick',
            data: {
              overtimeElapsed,
              sessionType: timerState.sessionType,
              status: timerState.status
            }
          });
        }
      }, CHECK_INTERVAL);
      
      self.postMessage({ 
        type: 'started',
        data: {
          timeRemaining: duration,
          sessionType: sessionType
        }
      });
      break;

    case 'pause':
      if (timerState.checkInterval && timerState.status === 'countdown') {
        clearInterval(timerState.checkInterval);
        timerState.checkInterval = null;
        timerState.pausedAt = Date.now();
        timerState.status = 'paused';
        
        const remaining = calculateRemainingTime();
        
        self.postMessage({ 
          type: 'paused',
          data: {
            timeRemaining: remaining,
            sessionType: timerState.sessionType
          }
        });
      }
      break;

    case 'resume':
      if (timerState.pausedAt > 0 && timerState.status === 'paused') {
        // 일시정지된 시간만큼 목표 시간 연장
        const pauseDuration = Date.now() - timerState.pausedAt;
        timerState.pausedDuration += pauseDuration;
        timerState.targetTime += pauseDuration;
        timerState.pausedAt = 0;
        timerState.status = 'countdown';
        
        // 타이머 재시작
        timerState.checkInterval = setInterval(() => {
          const remaining = calculateRemainingTime();
          
          if (remaining > 0) {
            self.postMessage({ 
              type: 'tick',
              data: {
                timeRemaining: remaining,
                sessionType: timerState.sessionType,
                status: 'countdown'
              }
            });
          } else if (timerState.status === 'countdown') {
            timerState.status = timerState.sessionType === 'study' ? 'overtime' : 'breakOvertime';
            timerState.overtimeStart = Date.now();
            
            self.postMessage({ 
              type: 'overtime_started',
              data: { 
                sessionType: timerState.sessionType
              }
            });
          } else if (timerState.status === 'overtime' || timerState.status === 'breakOvertime') {
            const overtimeElapsed = calculateOvertimeElapsed();
            
            self.postMessage({ 
              type: 'overtime_tick',
              data: {
                overtimeElapsed,
                sessionType: timerState.sessionType,
                status: timerState.status
              }
            });
          }
        }, CHECK_INTERVAL);
        
        self.postMessage({ 
          type: 'resumed',
          data: {
            timeRemaining: calculateRemainingTime(),
            sessionType: timerState.sessionType
          }
        });
      }
      break;

    case 'reset':
      if (timerState.checkInterval) {
        clearInterval(timerState.checkInterval);
        timerState.checkInterval = null;
      }
      
      timerState = {
        status: 'idle',
        targetTime: 0,
        startTime: 0,
        pausedAt: 0,
        pausedDuration: 0,
        overtimeStart: 0,
        checkInterval: null,
        sessionType: null
      };
      
      self.postMessage({ 
        type: 'reset',
        data: {
          sessionType: sessionType
        }
      });
      break;

    case 'stop':
      if (timerState.checkInterval) {
        clearInterval(timerState.checkInterval);
        timerState.checkInterval = null;
      }
      
      // 총 시간 계산 (설정 시간 + 초과 시간)
      const totalDuration = timerState.status === 'overtime' || timerState.status === 'breakOvertime'
        ? Math.floor((Date.now() - timerState.startTime - timerState.pausedDuration) / 1000)
        : Math.floor((timerState.targetTime - timerState.startTime - timerState.pausedDuration) / 1000);
      
      self.postMessage({ 
        type: 'stopped',
        data: {
          sessionType: timerState.sessionType,
          totalDuration: totalDuration,
          overtimeElapsed: calculateOvertimeElapsed()
        }
      });
      
      // 상태 초기화
      timerState = {
        status: 'idle',
        targetTime: 0,
        startTime: 0,
        pausedAt: 0,
        pausedDuration: 0,
        overtimeStart: 0,
        checkInterval: null,
        sessionType: null
      };
      break;

    case 'get_status':
      const currentStatus = {
        status: timerState.status,
        sessionType: timerState.sessionType,
        timeRemaining: calculateRemainingTime(),
        overtimeElapsed: calculateOvertimeElapsed(),
        isRunning: timerState.status === 'countdown' || timerState.status === 'overtime' || timerState.status === 'breakOvertime',
        isPaused: timerState.status === 'paused'
      };
      
      self.postMessage({
        type: 'status',
        data: currentStatus
      });
      break;
  }
};

// Handle cleanup when worker is terminated
self.onclose = function() {
  if (timerState.checkInterval) {
    clearInterval(timerState.checkInterval);
  }
};