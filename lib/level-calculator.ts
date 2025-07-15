/**
 * 레벨 시스템 계산 로직
 * 학습 시간에 따른 레벨, 경험치, 칭호 계산
 */

export interface LevelInfo {
  level: number;
  currentExp: number;
  requiredExp: number;
  experiencePercent: number;
  title: string;
  nextLevelExp: number;
}

/**
 * 총 학습 시간(분)을 기반으로 레벨 정보 계산
 * @param totalMinutes 총 학습 시간(분)
 * @returns 레벨 정보
 */
export function calculateLevel(totalMinutes: number): LevelInfo {
  const totalHours = totalMinutes / 60;
  
  // 레벨 공식: sqrt(총 시간 / 10)
  // 10시간마다 레벨 1 상승하는 구조 (점진적으로 느려짐)
  const level = Math.floor(Math.sqrt(totalHours / 10)) + 1;
  
  // 현재 레벨의 시작 시간과 다음 레벨 필요 시간
  const currentLevelHours = Math.pow(level - 1, 2) * 10;
  const nextLevelHours = Math.pow(level, 2) * 10;
  
  // 현재 레벨에서의 진행률
  const progressHours = totalHours - currentLevelHours;
  const requiredHours = nextLevelHours - currentLevelHours;
  const experiencePercent = Math.min(100, (progressHours / requiredHours) * 100);

  return {
    level,
    currentExp: Math.floor(progressHours * 60), // 분 단위
    requiredExp: Math.floor(requiredHours * 60), // 분 단위
    experiencePercent: Math.round(experiencePercent * 10) / 10, // 소수점 1자리
    title: getLevelTitle(level),
    nextLevelExp: Math.floor(nextLevelHours * 60) // 다음 레벨까지 필요한 총 경험치
  };
}

/**
 * 레벨에 따른 칭호 반환
 * @param level 현재 레벨
 * @returns 칭호
 */
export function getLevelTitle(level: number): string {
  if (level < 5) return '초보 학습자';
  if (level < 10) return '꾸준한 학습자';
  if (level < 15) return '성실한 학습자';
  if (level < 20) return '열정적인 학습자';
  if (level < 25) return '전문 학습자';
  if (level < 30) return '학습 마스터';
  if (level < 40) return '학습 그랜드마스터';
  if (level < 50) return '학습의 달인';
  if (level < 75) return '학습의 현자';
  if (level < 100) return '학습의 전설';
  return '학습의 신';
}

/**
 * 다음 레벨까지 남은 시간 계산
 * @param totalMinutes 현재 총 학습 시간(분)
 * @returns 다음 레벨까지 남은 시간(분)
 */
export function getMinutesToNextLevel(totalMinutes: number): number {
  const levelInfo = calculateLevel(totalMinutes);
  return levelInfo.requiredExp - levelInfo.currentExp;
}

/**
 * 특정 레벨에 도달하기 위해 필요한 총 시간
 * @param targetLevel 목표 레벨
 * @returns 필요한 총 시간(분)
 */
export function getTotalMinutesForLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0;
  const totalHours = Math.pow(targetLevel - 1, 2) * 10;
  return Math.floor(totalHours * 60);
}

/**
 * 레벨업까지 남은 퍼센트 계산
 * @param totalMinutes 현재 총 학습 시간(분)
 * @returns 레벨업까지 남은 퍼센트 (0-100)
 */
export function getProgressToNextLevel(totalMinutes: number): number {
  const levelInfo = calculateLevel(totalMinutes);
  return levelInfo.experiencePercent;
}

/**
 * 레벨에 따른 색상 반환 (UI용)
 * @param level 현재 레벨
 * @returns Tailwind CSS 색상 클래스
 */
export function getLevelColor(level: number): string {
  if (level < 10) return 'text-gray-600';
  if (level < 20) return 'text-green-600';
  if (level < 30) return 'text-blue-600';
  if (level < 50) return 'text-purple-600';
  if (level < 75) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * 레벨에 따른 배경 그라데이션 반환 (UI용)
 * @param level 현재 레벨
 * @returns Tailwind CSS 그라데이션 클래스
 */
export function getLevelGradient(level: number): string {
  if (level < 10) return 'from-gray-400 to-gray-600';
  if (level < 20) return 'from-green-400 to-green-600';
  if (level < 30) return 'from-blue-400 to-blue-600';
  if (level < 50) return 'from-purple-400 to-purple-600';
  if (level < 75) return 'from-orange-400 to-orange-600';
  return 'from-red-400 to-red-600';
}