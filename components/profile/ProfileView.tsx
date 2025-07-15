'use client';

import { ProfileHeader } from './header/ProfileHeader';
import { StatGrid } from './stats/StatGrid';
import { LongTermTrend } from './stats/LongTermTrend';
import { SubjectRadar } from './stats/SubjectRadar';
import { BadgeGallery } from './achievements/BadgeGallery';
import { LearningPattern } from './analysis/LearningPattern';

interface ProfileViewProps {
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      avatar_url?: string;
      created_at: string;
    };
    stats: {
      totalStudyDays: number;
      totalMinutes: number;
      totalSessions: number;
      currentStreak: number;
      totalBadges: number;
      level: number;
      currentExp: number;
      requiredExp: number;
      experiencePercent: number;
      title: string;
    };
    monthlyTrend: Array<{
      month: string;
      totalHours: number;
      avgDailyHours: number;
      studyDays: number;
      subjects: Record<string, number>;
    }>;
    subjectAnalysis: Array<{
      id: string;
      subject: string;
      color: string;
      hours: number;
      percentage: number;
      efficiency: number;
      consistency: number;
      sessionCount: number;
      lastStudied: string;
    }>;
    learningPattern: {
      preferredTime: string;
      mostProductiveDay: string;
      sessionStats?: {
        avgSessionLength: number;
        medianSessionLength: number;
        maxSessionLength: number;
      };
      insights: Array<{
        id: string;
        type: 'positive' | 'negative' | 'neutral' | 'tip';
        title: string;
        description: string;
        icon: string;
      }>;
    };
    achievements: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      category: 'milestone' | 'streak' | 'subject' | 'special';
      unlockedAt?: string;
      progress?: number;
      requirement?: string;
    }>;
  };
}

export function ProfileView({ data }: ProfileViewProps) {
  return (
    <div className="space-y-6">
      {/* 프로필 헤더 */}
      <ProfileHeader user={data.user} stats={data.stats} />

      {/* 통계 그리드 */}
      <StatGrid stats={data.stats} />

      {/* 학습 패턴 분석 */}
      <LearningPattern data={data.learningPattern} />

      {/* 차트 섹션 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <LongTermTrend data={data.monthlyTrend} />
        <SubjectRadar data={data.subjectAnalysis} />
      </div>

      {/* 뱃지 갤러리 */}
      <BadgeGallery badges={data.achievements} />
    </div>
  );
}