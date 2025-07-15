'use client';

import { getLevelColor } from '@/lib/level-calculator';

interface TitleBadgeProps {
  title: string;
  level: number;
}

export function TitleBadge({ title, level }: TitleBadgeProps) {
  const colorClass = getLevelColor(level);

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`text-lg font-medium ${colorClass}`}>
        {title}
      </span>
      {level >= 50 && (
        <span className="animate-pulse">✨</span>
      )}
    </div>
  );
}