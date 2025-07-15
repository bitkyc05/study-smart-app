/**
 * 학습 데이터 분석 엔진
 * 학습 패턴, 효율성, 인사이트 생성
 */

export interface LearningInsight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'tip';
  title: string;
  description: string;
  icon: string;
  priority: number;
}

export interface LearningPatternAnalysis {
  preferredTimeSlot: string;
  mostProductiveDay: string;
  averageSessionLength: number;
  consistency: number; // 0-100
  focusScore: number; // 0-100
  insights: LearningInsight[];
}

export interface SubjectAnalysis {
  subject: string;
  totalHours: number;
  efficiency: number; // 평균 세션 길이
  consistency: number; // 규칙성 점수
  mastery: number; // 숙련도 점수
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * 시간대별 학습 패턴 분석
 */
export function analyzeTimePattern(hourlyData: Array<{ hour: number; totalMinutes: number }>): string {
  if (!hourlyData || hourlyData.length === 0) return '데이터 없음';
  
  const maxHour = hourlyData.reduce((max, curr) => 
    curr.totalMinutes > max.totalMinutes ? curr : max
  );
  
  if (maxHour.hour >= 5 && maxHour.hour < 9) return '새벽형 (5-9시)';
  if (maxHour.hour >= 9 && maxHour.hour < 12) return '오전형 (9-12시)';
  if (maxHour.hour >= 12 && maxHour.hour < 18) return '오후형 (12-18시)';
  if (maxHour.hour >= 18 && maxHour.hour < 22) return '저녁형 (18-22시)';
  return '심야형 (22시-5시)';
}

/**
 * 요일별 학습 패턴 분석
 */
export function analyzeDayPattern(dayData: Array<{ dayOfWeek: number; totalMinutes: number }>): string {
  if (!dayData || dayData.length === 0) return '데이터 없음';
  
  const maxDay = dayData.reduce((max, curr) => 
    curr.totalMinutes > max.totalMinutes ? curr : max
  );
  
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return days[maxDay.dayOfWeek];
}

/**
 * 학습 일관성 점수 계산 (0-100)
 */
export function calculateConsistencyScore(
  studyDays: number,
  totalDays: number,
  currentStreak: number
): number {
  if (totalDays === 0) return 0;
  
  const frequencyScore = (studyDays / totalDays) * 50; // 50점 만점
  const streakScore = Math.min(currentStreak / 30, 1) * 50; // 30일 기준 50점 만점
  
  return Math.round(frequencyScore + streakScore);
}

/**
 * 집중도 점수 계산 (0-100)
 */
export function calculateFocusScore(
  avgSessionLength: number,
  sessionCompletionRate: number
): number {
  // 이상적인 세션 길이는 25분
  const idealLength = 25;
  const lengthScore = Math.max(0, 100 - Math.abs(avgSessionLength - idealLength) * 2);
  const completionScore = sessionCompletionRate * 100;
  
  return Math.round((lengthScore + completionScore) / 2);
}

/**
 * 과목별 숙련도 점수 계산 (0-100)
 */
export function calculateMasteryScore(
  totalHours: number,
  consistency: number,
  avgSessionLength: number
): number {
  // 시간 점수 (100시간 기준)
  const timeScore = Math.min(totalHours / 100, 1) * 40;
  
  // 일관성 점수 (40점)
  const consistencyScore = (consistency / 100) * 40;
  
  // 효율성 점수 (20점) - 25분에 가까울수록 높음
  const efficiencyScore = Math.max(0, 20 - Math.abs(avgSessionLength - 25) * 0.5);
  
  return Math.round(timeScore + consistencyScore + efficiencyScore);
}

/**
 * 학습 추세 분석
 */
export function analyzeTrend(monthlyData: Array<{ totalHours: number }>): 'improving' | 'stable' | 'declining' {
  if (!monthlyData || monthlyData.length < 2) return 'stable';
  
  const recent = monthlyData.slice(-3); // 최근 3개월
  if (recent.length < 2) return 'stable';
  
  const avgRecent = recent.reduce((sum, m) => sum + m.totalHours, 0) / recent.length;
  const avgPrevious = monthlyData.slice(0, -3).reduce((sum, m) => sum + m.totalHours, 0) / 
    Math.max(monthlyData.length - 3, 1);
  
  const changeRate = (avgRecent - avgPrevious) / Math.max(avgPrevious, 1);
  
  if (changeRate > 0.2) return 'improving';
  if (changeRate < -0.2) return 'declining';
  return 'stable';
}

/**
 * 학습 인사이트 생성
 */
export function generateInsights(data: {
  totalHours: number;
  currentStreak: number;
  avgSessionLength: number;
  preferredTime: string;
  mostProductiveDay: string;
  consistencyScore: number;
  focusScore: number;
  monthlyTrend: 'improving' | 'stable' | 'declining';
}): LearningInsight[] {
  const insights: LearningInsight[] = [];
  
  // 긍정적 인사이트
  if (data.currentStreak >= 7) {
    insights.push({
      id: 'streak_achievement',
      type: 'positive',
      title: '훌륭한 연속 학습!',
      description: `${data.currentStreak}일 연속으로 학습하고 계십니다. 꾸준함이 성공의 열쇠입니다!`,
      icon: 'fire',
      priority: 9
    });
  }
  
  if (data.consistencyScore >= 80) {
    insights.push({
      id: 'high_consistency',
      type: 'positive',
      title: '매우 일관된 학습 패턴',
      description: '규칙적인 학습 습관을 잘 유지하고 계십니다.',
      icon: 'check-circle',
      priority: 8
    });
  }
  
  if (data.monthlyTrend === 'improving') {
    insights.push({
      id: 'improving_trend',
      type: 'positive',
      title: '학습량 증가 추세',
      description: '최근 학습 시간이 증가하고 있습니다. 좋은 신호입니다!',
      icon: 'trending-up',
      priority: 7
    });
  }
  
  // 개선 필요 인사이트
  if (data.currentStreak === 0) {
    insights.push({
      id: 'streak_broken',
      type: 'negative',
      title: '연속 학습 기록이 끊겼습니다',
      description: '오늘 학습을 시작하여 새로운 연속 기록을 만들어보세요.',
      icon: 'alert-circle',
      priority: 10
    });
  }
  
  if (data.avgSessionLength < 20) {
    insights.push({
      id: 'short_sessions',
      type: 'negative',
      title: '세션이 너무 짧습니다',
      description: '평균 세션 시간이 20분 미만입니다. 25분 세션을 목표로 해보세요.',
      icon: 'clock',
      priority: 6
    });
  }
  
  if (data.consistencyScore < 40) {
    insights.push({
      id: 'low_consistency',
      type: 'negative',
      title: '학습 규칙성 개선 필요',
      description: '더 규칙적인 학습 습관을 만들어보세요.',
      icon: 'calendar',
      priority: 8
    });
  }
  
  // 팁 인사이트
  insights.push({
    id: 'preferred_time_tip',
    type: 'tip',
    title: `${data.preferredTime}에 가장 집중이 잘 됩니다`,
    description: '이 시간대에 중요한 학습을 배치해보세요.',
    icon: 'lightbulb',
    priority: 5
  });
  
  insights.push({
    id: 'productive_day_tip',
    type: 'tip',
    title: `${data.mostProductiveDay}에 가장 많이 학습합니다`,
    description: '이 요일에 도전적인 과제를 계획해보세요.',
    icon: 'lightbulb',
    priority: 4
  });
  
  // 중립적 인사이트
  if (data.totalHours >= 100) {
    const level = Math.floor(Math.sqrt(data.totalHours / 10)) + 1;
    insights.push({
      id: 'level_info',
      type: 'neutral',
      title: `레벨 ${level} 달성`,
      description: `총 ${Math.round(data.totalHours)}시간 학습했습니다.`,
      icon: 'award',
      priority: 3
    });
  }
  
  // 우선순위로 정렬
  return insights.sort((a, b) => b.priority - a.priority);
}

/**
 * 주간 대비 성장률 계산
 */
export function calculateWeeklyGrowth(
  thisWeekMinutes: number,
  lastWeekMinutes: number
): { percentage: number; direction: 'up' | 'down' | 'stable' } {
  if (lastWeekMinutes === 0) {
    return { percentage: 100, direction: 'up' };
  }
  
  const growth = ((thisWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100;
  
  return {
    percentage: Math.abs(Math.round(growth)),
    direction: growth > 5 ? 'up' : growth < -5 ? 'down' : 'stable'
  };
}

/**
 * 학습 효율성 등급 계산
 */
export function calculateEfficiencyGrade(avgSessionLength: number): {
  grade: string;
  color: string;
  description: string;
} {
  if (avgSessionLength >= 23 && avgSessionLength <= 27) {
    return { grade: 'S', color: 'text-purple-600', description: '완벽한 포모도로 타이밍' };
  }
  if (avgSessionLength >= 20 && avgSessionLength <= 30) {
    return { grade: 'A', color: 'text-green-600', description: '우수한 집중력' };
  }
  if (avgSessionLength >= 15 && avgSessionLength <= 35) {
    return { grade: 'B', color: 'text-blue-600', description: '양호한 학습 패턴' };
  }
  if (avgSessionLength >= 10 && avgSessionLength <= 40) {
    return { grade: 'C', color: 'text-yellow-600', description: '개선 가능한 수준' };
  }
  return { grade: 'D', color: 'text-red-600', description: '집중력 향상 필요' };
}