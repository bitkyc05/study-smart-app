'use client';

import { useState } from 'react';
import { Lock, Trophy, Star, Target, Zap, Book, Clock, Calendar, Sun, Moon } from 'lucide-react';
import { getCategoryColor } from '@/lib/badge-system';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'streak' | 'subject' | 'special';
  unlockedAt?: string;
  progress?: number;
  requirement?: string;
}

interface BadgeGalleryProps {
  badges: Badge[];
}

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  star: Star,
  target: Target,
  zap: Zap,
  book: Book,
  clock: Clock,
  calendar: Calendar,
  sun: Sun,
  moon: Moon
};

export function BadgeGallery({ badges }: BadgeGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: '전체', count: badges.length },
    { id: 'milestone', label: '마일스톤', count: badges.filter(b => b.category === 'milestone').length },
    { id: 'streak', label: '연속 학습', count: badges.filter(b => b.category === 'streak').length },
    { id: 'subject', label: '과목 마스터', count: badges.filter(b => b.category === 'subject').length },
    { id: 'special', label: '특별 업적', count: badges.filter(b => b.category === 'special').length }
  ];

  const filteredBadges = selectedCategory === 'all' 
    ? badges 
    : badges.filter(b => b.category === selectedCategory);

  const unlockedBadges = filteredBadges.filter(b => b.unlockedAt);
  const lockedBadges = filteredBadges.filter(b => !b.unlockedAt);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">뱃지 컬렉션</h3>
        
        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                transition-all duration-200
                ${selectedCategory === cat.id 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
                }
              `}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* 획득한 뱃지 */}
      {unlockedBadges.length > 0 && (
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-700 mb-4">
            획득한 뱃지 ({unlockedBadges.length})
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {unlockedBadges.map(badge => {
              const Icon = BADGE_ICONS[badge.icon] || Trophy;
              
              return (
                <div
                  key={badge.id}
                  className="relative group cursor-pointer"
                  onMouseEnter={() => setHoveredBadge(badge.id)}
                  onMouseLeave={() => setHoveredBadge(null)}
                >
                  <div className={`
                    w-20 h-20 rounded-xl flex items-center justify-center
                    transition-all duration-200 transform hover:scale-110
                    ${getCategoryColor(badge.category)}
                  `}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  
                  {/* 반짝이는 효과 */}
                  <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                  
                  {/* 툴팁 */}
                  {hoveredBadge === badge.id && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
                      <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm whitespace-nowrap">
                        <p className="font-medium">{badge.name}</p>
                        <p className="text-gray-300 mt-1 text-xs">{badge.description}</p>
                        {badge.unlockedAt && (
                          <p className="text-gray-400 mt-2 text-xs">
                            획득일: {new Date(badge.unlockedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 미획득 뱃지 */}
      {lockedBadges.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-4">
            도전 과제 ({lockedBadges.length})
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {lockedBadges.map(badge => {
              const Icon = BADGE_ICONS[badge.icon] || Trophy;
              
              return (
                <div
                  key={badge.id}
                  className="relative cursor-pointer"
                  onMouseEnter={() => setHoveredBadge(badge.id)}
                  onMouseLeave={() => setHoveredBadge(null)}
                >
                  <div className="w-20 h-20 rounded-xl bg-gray-200 flex items-center justify-center relative overflow-hidden">
                    <Icon className="w-10 h-10 text-gray-400" />
                    
                    {/* 잠금 오버레이 */}
                    <div className="absolute inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-gray-300" />
                    </div>
                    
                    {/* 진행률 표시 */}
                    {badge.progress !== undefined && badge.progress > 0 && (
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-yellow-400 bg-opacity-30"
                        style={{ height: `${badge.progress}%` }}
                      />
                    )}
                  </div>
                  
                  {/* 툴팁 */}
                  {hoveredBadge === badge.id && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
                      <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm whitespace-nowrap">
                        <p className="font-medium">{badge.name}</p>
                        <p className="text-gray-300 mt-1 text-xs">{badge.description}</p>
                        {badge.requirement && (
                          <p className="text-yellow-400 mt-2 text-xs">조건: {badge.requirement}</p>
                        )}
                        {badge.progress !== undefined && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>진행률</span>
                              <span>{Math.round(badge.progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-1">
                              <div 
                                className="bg-yellow-400 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${badge.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 뱃지가 없는 경우 */}
      {badges.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>아직 획득한 뱃지가 없습니다.</p>
          <p className="text-sm mt-2">학습을 시작하여 첫 뱃지를 획득해보세요!</p>
        </div>
      )}
    </div>
  );
}