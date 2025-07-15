'use client';

import { getLevelGradient } from '@/lib/level-calculator';

interface LevelProgressProps {
  level: number;
  currentExp: number;
  requiredExp: number;
  experiencePercent: number;
}

export function LevelProgress({ level, currentExp, requiredExp, experiencePercent }: LevelProgressProps) {
  const gradient = getLevelGradient(level);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">레벨 {level}</span>
        <span className="text-gray-500">
          {currentExp} / {requiredExp} EXP
        </span>
      </div>
      
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${gradient} transition-all duration-500 ease-out`}
          style={{ width: `${experiencePercent}%` }}
        />
        
        {/* 반짝이는 효과 */}
        <div
          className="absolute inset-y-0 left-0 bg-white opacity-30 transition-all duration-500 ease-out"
          style={{ 
            width: `${experiencePercent}%`,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)'
          }}
        />
      </div>
      
      <p className="text-xs text-gray-500 text-center">
        다음 레벨까지 {requiredExp - currentExp} EXP
      </p>
    </div>
  );
}