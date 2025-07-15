/**
 * 뱃지 시스템 정의 및 로직
 */

export type BadgeCategory = 'milestone' | 'streak' | 'subject' | 'special' | 'seasonal';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  requirement?: string;
  checkFunction?: (stats: BadgeCheckStats) => boolean;
  progressFunction?: (stats: BadgeCheckStats) => number;
}

export interface BadgeCheckStats {
  totalMinutes: number;
  totalSessions: number;
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
  subjectHours: Record<string, number>;
  earlyBirdSessions: number; // 오전 6시 이전 세션
  nightOwlSessions: number; // 오후 10시 이후 세션
  weekendSessions: number;
  perfectDays: number; // 목표 달성한 날
}

// 뱃지 정의
export const BADGES: Badge[] = [
  // === 마일스톤 뱃지 ===
  {
    id: 'first_session',
    name: '첫 걸음',
    description: '첫 번째 포모도로 세션을 완료했습니다',
    icon: 'trophy',
    category: 'milestone',
    rarity: 'common',
    requirement: '1개 세션 완료',
    checkFunction: (stats) => stats.totalSessions >= 1,
    progressFunction: (stats) => Math.min(100, stats.totalSessions * 100)
  },
  {
    id: '10_hours',
    name: '10시간의 여정',
    description: '총 10시간 학습을 달성했습니다',
    icon: 'clock',
    category: 'milestone',
    rarity: 'common',
    requirement: '10시간 학습',
    checkFunction: (stats) => stats.totalMinutes >= 600,
    progressFunction: (stats) => Math.min(100, (stats.totalMinutes / 600) * 100)
  },
  {
    id: '50_hours',
    name: '반백의 달성',
    description: '총 50시간 학습을 달성했습니다',
    icon: 'clock',
    category: 'milestone',
    rarity: 'rare',
    requirement: '50시간 학습',
    checkFunction: (stats) => stats.totalMinutes >= 3000,
    progressFunction: (stats) => Math.min(100, (stats.totalMinutes / 3000) * 100)
  },
  {
    id: '100_hours',
    name: '백시간의 마스터',
    description: '총 100시간 학습을 달성했습니다',
    icon: 'star',
    category: 'milestone',
    rarity: 'epic',
    requirement: '100시간 학습',
    checkFunction: (stats) => stats.totalMinutes >= 6000,
    progressFunction: (stats) => Math.min(100, (stats.totalMinutes / 6000) * 100)
  },
  {
    id: '500_hours',
    name: '학습의 달인',
    description: '총 500시간 학습을 달성했습니다',
    icon: 'star',
    category: 'milestone',
    rarity: 'legendary',
    requirement: '500시간 학습',
    checkFunction: (stats) => stats.totalMinutes >= 30000,
    progressFunction: (stats) => Math.min(100, (stats.totalMinutes / 30000) * 100)
  },
  {
    id: '1000_hours',
    name: '천시간의 전설',
    description: '총 1000시간 학습을 달성했습니다',
    icon: 'star',
    category: 'milestone',
    rarity: 'legendary',
    requirement: '1000시간 학습',
    checkFunction: (stats) => stats.totalMinutes >= 60000,
    progressFunction: (stats) => Math.min(100, (stats.totalMinutes / 60000) * 100)
  },

  // === 연속 학습 뱃지 ===
  {
    id: 'streak_3',
    name: '3일 연속',
    description: '3일 연속으로 학습했습니다',
    icon: 'zap',
    category: 'streak',
    rarity: 'common',
    requirement: '3일 연속 학습',
    checkFunction: (stats) => stats.currentStreak >= 3,
    progressFunction: (stats) => Math.min(100, (stats.currentStreak / 3) * 100)
  },
  {
    id: 'streak_7',
    name: '일주일 전사',
    description: '7일 연속으로 학습했습니다',
    icon: 'zap',
    category: 'streak',
    rarity: 'common',
    requirement: '7일 연속 학습',
    checkFunction: (stats) => stats.currentStreak >= 7,
    progressFunction: (stats) => Math.min(100, (stats.currentStreak / 7) * 100)
  },
  {
    id: 'streak_30',
    name: '한 달의 인내',
    description: '30일 연속으로 학습했습니다',
    icon: 'zap',
    category: 'streak',
    rarity: 'rare',
    requirement: '30일 연속 학습',
    checkFunction: (stats) => stats.currentStreak >= 30,
    progressFunction: (stats) => Math.min(100, (stats.currentStreak / 30) * 100)
  },
  {
    id: 'streak_100',
    name: '백일의 약속',
    description: '100일 연속으로 학습했습니다',
    icon: 'zap',
    category: 'streak',
    rarity: 'epic',
    requirement: '100일 연속 학습',
    checkFunction: (stats) => stats.currentStreak >= 100,
    progressFunction: (stats) => Math.min(100, (stats.currentStreak / 100) * 100)
  },
  {
    id: 'streak_365',
    name: '일년의 헌신',
    description: '365일 연속으로 학습했습니다',
    icon: 'zap',
    category: 'streak',
    rarity: 'legendary',
    requirement: '365일 연속 학습',
    checkFunction: (stats) => stats.currentStreak >= 365,
    progressFunction: (stats) => Math.min(100, (stats.currentStreak / 365) * 100)
  },

  // === 세션 수 뱃지 ===
  {
    id: '100_sessions',
    name: '백 번의 집중',
    description: '100개의 포모도로 세션을 완료했습니다',
    icon: 'target',
    category: 'milestone',
    rarity: 'rare',
    requirement: '100회 세션 완료',
    checkFunction: (stats) => stats.totalSessions >= 100,
    progressFunction: (stats) => Math.min(100, (stats.totalSessions / 100) * 100)
  },
  {
    id: '500_sessions',
    name: '오백 번의 도전',
    description: '500개의 포모도로 세션을 완료했습니다',
    icon: 'target',
    category: 'milestone',
    rarity: 'epic',
    requirement: '500회 세션 완료',
    checkFunction: (stats) => stats.totalSessions >= 500,
    progressFunction: (stats) => Math.min(100, (stats.totalSessions / 500) * 100)
  },
  {
    id: '1000_sessions',
    name: '천 번의 완성',
    description: '1000개의 포모도로 세션을 완료했습니다',
    icon: 'target',
    category: 'milestone',
    rarity: 'legendary',
    requirement: '1000회 세션 완료',
    checkFunction: (stats) => stats.totalSessions >= 1000,
    progressFunction: (stats) => Math.min(100, (stats.totalSessions / 1000) * 100)
  },

  // === 특별 업적 뱃지 ===
  {
    id: 'early_bird',
    name: '새벽형 인간',
    description: '오전 6시 이전에 50회 이상 학습했습니다',
    icon: 'sun',
    category: 'special',
    rarity: 'rare',
    requirement: '새벽 학습 50회',
    checkFunction: (stats) => stats.earlyBirdSessions >= 50,
    progressFunction: (stats) => Math.min(100, (stats.earlyBirdSessions / 50) * 100)
  },
  {
    id: 'night_owl',
    name: '올빼미형 인간',
    description: '오후 10시 이후에 50회 이상 학습했습니다',
    icon: 'moon',
    category: 'special',
    rarity: 'rare',
    requirement: '심야 학습 50회',
    checkFunction: (stats) => stats.nightOwlSessions >= 50,
    progressFunction: (stats) => Math.min(100, (stats.nightOwlSessions / 50) * 100)
  },
  {
    id: 'weekend_warrior',
    name: '주말 전사',
    description: '주말에 100회 이상 학습했습니다',
    icon: 'calendar',
    category: 'special',
    rarity: 'rare',
    requirement: '주말 학습 100회',
    checkFunction: (stats) => stats.weekendSessions >= 100,
    progressFunction: (stats) => Math.min(100, (stats.weekendSessions / 100) * 100)
  },
  {
    id: 'all_rounder',
    name: '올라운더',
    description: '5개 이상의 과목을 각각 10시간 이상 학습했습니다',
    icon: 'book',
    category: 'subject',
    rarity: 'epic',
    requirement: '5과목 10시간 이상',
    checkFunction: (stats) => {
      const subjects = Object.values(stats.subjectHours);
      return subjects.filter(hours => hours >= 10).length >= 5;
    },
    progressFunction: (stats) => {
      const subjects = Object.values(stats.subjectHours);
      const qualifiedSubjects = subjects.filter(hours => hours >= 10).length;
      return Math.min(100, (qualifiedSubjects / 5) * 100);
    }
  },
  {
    id: 'subject_master',
    name: '과목 마스터',
    description: '하나의 과목을 100시간 이상 학습했습니다',
    icon: 'book',
    category: 'subject',
    rarity: 'epic',
    requirement: '단일 과목 100시간',
    checkFunction: (stats) => {
      const maxHours = Math.max(...Object.values(stats.subjectHours), 0);
      return maxHours >= 100;
    },
    progressFunction: (stats) => {
      const maxHours = Math.max(...Object.values(stats.subjectHours), 0);
      return Math.min(100, (maxHours / 100) * 100);
    }
  },
  {
    id: 'perfect_week',
    name: '완벽한 일주일',
    description: '일주일 동안 매일 목표를 달성했습니다',
    icon: 'trophy',
    category: 'special',
    rarity: 'rare',
    requirement: '7일 연속 목표 달성',
    checkFunction: (stats) => stats.perfectDays >= 7,
    progressFunction: (stats) => Math.min(100, (stats.perfectDays / 7) * 100)
  }
];

/**
 * 뱃지 희귀도에 따른 색상 반환
 */
export function getRarityColor(rarity: BadgeRarity): string {
  switch (rarity) {
    case 'common': return 'from-gray-400 to-gray-600';
    case 'rare': return 'from-blue-400 to-blue-600';
    case 'epic': return 'from-purple-400 to-purple-600';
    case 'legendary': return 'from-yellow-400 to-orange-600';
    default: return 'from-gray-400 to-gray-600';
  }
}

/**
 * 뱃지 카테고리에 따른 색상 반환
 */
export function getCategoryColor(category: BadgeCategory): string {
  switch (category) {
    case 'milestone': return 'bg-blue-500';
    case 'streak': return 'bg-green-500';
    case 'subject': return 'bg-purple-500';
    case 'special': return 'bg-orange-500';
    case 'seasonal': return 'bg-pink-500';
    default: return 'bg-gray-500';
  }
}

/**
 * 뱃지 진행률 계산
 */
export function calculateBadgeProgress(badge: Badge, stats: BadgeCheckStats): number {
  if (badge.progressFunction) {
    return badge.progressFunction(stats);
  }
  return badge.checkFunction?.(stats) ? 100 : 0;
}

/**
 * 획득 가능한 뱃지 체크
 */
export function checkEarnedBadges(stats: BadgeCheckStats): string[] {
  return BADGES
    .filter(badge => badge.checkFunction?.(stats) === true)
    .map(badge => badge.id);
}

/**
 * 다음 획득 가능한 뱃지 추천
 */
export function getRecommendedBadges(stats: BadgeCheckStats, limit: number = 3): Badge[] {
  return BADGES
    .filter(badge => {
      const progress = calculateBadgeProgress(badge, stats);
      return progress > 0 && progress < 100;
    })
    .sort((a, b) => {
      const progressA = calculateBadgeProgress(a, stats);
      const progressB = calculateBadgeProgress(b, stats);
      return progressB - progressA;
    })
    .slice(0, limit);
}