'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TrendData {
  month: string;
  totalHours: number;
  avgDailyHours: number;
  studyDays: number;
  subjects: Record<string, number>;
}

interface LongTermTrendProps {
  data: TrendData[];
}

export function LongTermTrend({ data }: LongTermTrendProps) {
  const [viewMode, setViewMode] = useState<'total' | 'average' | 'subjects'>('total');

  // 과목별 색상
  const subjectColors: Record<string, string> = {
    '수학': '#3B82F6',
    '영어': '#10B981',
    '과학': '#F59E0B',
    '프로그래밍': '#8B5CF6',
    '기타': '#6B7280'
  };

  // 데이터 포맷팅
  const formattedData = data.map(item => ({
    ...item,
    monthLabel: format(new Date(item.month + '-01'), 'MMM', { locale: ko })
  }));

  const renderChart = () => {
    switch (viewMode) {
      case 'total':
        return (
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number) => [`${value}시간`, '총 학습']}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="totalHours"
              stroke="#3B82F6"
              fillOpacity={1}
              fill="url(#colorTotal)"
              strokeWidth={2}
            />
          </AreaChart>
        );

      case 'average':
        return (
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number) => [`${value}시간`, '일 평균']}
              labelFormatter={(label) => label}
            />
            <Line
              type="monotone"
              dataKey="avgDailyHours"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case 'subjects':
        // 과목별 데이터 재구성
        const subjectData = formattedData.map(item => {
          const result: Record<string, string | number> = { monthLabel: item.monthLabel };
          Object.entries(item.subjects || {}).forEach(([subject, minutes]) => {
            result[subject] = Math.round((minutes as number) / 60 * 10) / 10; // 시간으로 변환
          });
          return result;
        });

        const allSubjects = Array.from(
          new Set(formattedData.flatMap(item => Object.keys(item.subjects || {})))
        );

        return (
          <AreaChart data={subjectData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number, name: string) => [`${value}시간`, name]}
              labelFormatter={(label) => label}
            />
            {allSubjects.map(subject => (
              <Area
                key={subject}
                type="monotone"
                dataKey={subject}
                stackId="1"
                stroke={subjectColors[subject] || '#9CA3AF'}
                fill={subjectColors[subject] || '#9CA3AF'}
              />
            ))}
            <Legend />
          </AreaChart>
        );
    }
  };

  // 성장률 계산
  const calculateGrowth = () => {
    if (data.length < 2) return null;
    const recent = data[data.length - 1].totalHours;
    const previous = data[data.length - 2].totalHours;
    const growth = ((recent - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(growth)),
      isPositive: growth >= 0
    };
  };

  const growth = calculateGrowth();

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">학습 추세 (최근 6개월)</h3>
        
        {/* 뷰 모드 선택 */}
        <div className="flex gap-2">
          {[
            { id: 'total', label: '총 시간' },
            { id: 'average', label: '일 평균' },
            { id: 'subjects', label: '과목별' }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as 'total' | 'average' | 'subjects')}
              className={`
                px-3 py-1 rounded-lg text-sm font-medium transition-colors
                ${viewMode === mode.id 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* 인사이트 */}
      {growth && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-1">
            📈 학습 추세 인사이트
          </p>
          <p className="text-sm text-gray-600">
            지난 달 대비 학습 시간이 {growth.value}% {growth.isPositive ? '증가' : '감소'}했습니다.
            {growth.isPositive 
              ? ' 좋은 성장세를 유지하고 있습니다!' 
              : ' 다시 학습 루틴을 회복해보세요.'
            }
          </p>
        </div>
      )}
    </div>
  );
}