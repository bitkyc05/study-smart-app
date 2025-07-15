'use client';

import { Clock, Target, Calendar, Trophy, TrendingUp, BookOpen } from 'lucide-react';

interface StatGridProps {
  stats: {
    totalStudyDays: number;
    totalMinutes: number;
    totalSessions: number;
    currentStreak: number;
    totalBadges: number;
    level: number;
  };
}

export function StatGrid({ stats }: StatGridProps) {
  // 기본값 설정
  const safeStats = {
    totalStudyDays: stats?.totalStudyDays || 0,
    totalMinutes: stats?.totalMinutes || 0,
    totalSessions: stats?.totalSessions || 0,
    currentStreak: stats?.currentStreak || 0,
    totalBadges: stats?.totalBadges || 0,
    level: stats?.level || 1
  };

  const totalHours = Math.round(safeStats.totalMinutes / 60);
  const avgHoursPerDay = safeStats.totalStudyDays > 0 
    ? (totalHours / safeStats.totalStudyDays).toFixed(1)
    : '0';
  const avgSessionLength = safeStats.totalSessions > 0
    ? Math.round(safeStats.totalMinutes / safeStats.totalSessions)
    : 0;

  const statItems = [
    {
      icon: Clock,
      label: '총 학습 시간',
      value: `${totalHours}시간`,
      subValue: `${safeStats.totalMinutes}분`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Target,
      label: '완료 세션',
      value: safeStats.totalSessions.toLocaleString(),
      subValue: `평균 ${avgSessionLength}분`,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: Calendar,
      label: '학습일',
      value: `${safeStats.totalStudyDays}일`,
      subValue: `일평균 ${avgHoursPerDay}시간`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Trophy,
      label: '연속 학습',
      value: `${safeStats.currentStreak}일`,
      subValue: safeStats.currentStreak >= 7 ? '🔥 화이팅!' : '연속 기록 도전!',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: TrendingUp,
      label: '현재 레벨',
      value: `Lv.${safeStats.level}`,
      subValue: '성장 중',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      icon: BookOpen,
      label: '획득 뱃지',
      value: `${safeStats.totalBadges}개`,
      subValue: '업적 달성',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {item.label}
                </p>
                <p className={`text-2xl font-bold ${item.color}`}>
                  {item.value}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {item.subValue}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${item.bgColor}`}>
                <Icon className={`w-6 h-6 ${item.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}