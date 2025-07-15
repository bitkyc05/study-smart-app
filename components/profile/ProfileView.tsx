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
    monthlyTrend: any[];
    subjectAnalysis: any[];
    learningPattern: any;
    achievements: any[];
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