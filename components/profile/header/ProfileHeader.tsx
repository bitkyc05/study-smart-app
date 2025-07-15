'use client';

import Image from 'next/image';
import { User, Calendar, Trophy, Zap } from 'lucide-react';
import { LevelProgress } from './LevelProgress';
import { TitleBadge } from './TitleBadge';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ProfileHeaderProps {
  user: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    created_at: string;
  };
  stats: {
    totalMinutes: number;
    totalSessions: number;
    currentStreak: number;
    level: number;
    currentExp: number;
    requiredExp: number;
    experiencePercent: number;
    title: string;
  };
}

export function ProfileHeader({ user, stats }: ProfileHeaderProps) {
  const memberDays = differenceInDays(new Date(), new Date(user.created_at));
  const totalHours = Math.round(stats.totalMinutes / 60);

  return (
    <div className="bg-white rounded-xl p-8 shadow-sm border">
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
        {/* 아바타 */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.name}
                width={128}
                height={128}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
          
          {/* 레벨 뱃지 */}
          <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm border-2 border-white">
            {stats.level}
          </div>
        </div>

        {/* 정보 섹션 */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl font-bold mb-2">{user.name || user.email}</h1>
          
          {/* 칭호 */}
          <TitleBadge title={stats.title} level={stats.level} />
          
          {/* 메타 정보 */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 justify-center md:justify-start">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>가입일: {format(new Date(user.created_at), 'yyyy년 MM월 dd일', { locale: ko })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span>{memberDays}일째 학습 중</span>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              <span>연속 {stats.currentStreak}일</span>
            </div>
          </div>

          {/* 레벨 진행률 */}
          <div className="mt-6 max-w-md mx-auto md:mx-0">
            <LevelProgress 
              level={stats.level}
              currentExp={stats.currentExp}
              requiredExp={stats.requiredExp}
              experiencePercent={stats.experiencePercent}
            />
          </div>
        </div>

        {/* 빠른 통계 */}
        <div className="grid grid-cols-2 gap-4 mt-6 md:mt-0">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{totalHours}시간</p>
            <p className="text-sm text-gray-500">총 학습 시간</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{stats.totalSessions}</p>
            <p className="text-sm text-gray-500">완료 세션</p>
          </div>
        </div>
      </div>
    </div>
  );
}