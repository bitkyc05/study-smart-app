'use client';

import { formatMinutes } from '@/lib/calendar-utils';
import { StudySession } from '@/lib/actions/calendar';
import { Clock, BookOpen } from 'lucide-react';

interface SessionListProps {
  sessions: StudySession[];
}

export function SessionList({ sessions }: SessionListProps) {
  const totalMinutes = sessions.reduce((sum, session) => sum + Math.floor(session.duration_seconds / 60), 0);

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">이 날은 학습 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 총 학습 시간 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            총 학습 시간
          </span>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatMinutes(totalMinutes)}
          </span>
        </div>
      </div>

      {/* 세션 목록 */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          학습 세션 ({sessions.length}개)
        </h4>
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: session.subjects?.color_hex || '#6B7280' }}
              >
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {session.subjects?.name || '기타'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {session.created_at 
                    ? new Date(session.created_at).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : new Date(session.end_time).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formatMinutes(Math.floor(session.duration_seconds / 60))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}