'use client';

import { Clock, Calendar, TrendingUp, Lightbulb, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { calculateEfficiencyGrade } from '@/lib/analytics-engine';

interface LearningPatternProps {
  data: {
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
}

export function LearningPattern({ data }: LearningPatternProps) {
  const avgSessionLength = data.sessionStats?.avgSessionLength || 0;
  const efficiencyGrade = calculateEfficiencyGrade(avgSessionLength);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive': return CheckCircle;
      case 'negative': return AlertCircle;
      case 'tip': return Lightbulb;
      default: return Info;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      case 'tip': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* 학습 패턴 요약 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">학습 패턴 분석</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 선호 시간대 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">선호 시간대</span>
            </div>
            <p className="text-lg font-semibold">{data.preferredTime}</p>
            <p className="text-xs text-gray-500 mt-1">가장 집중이 잘 되는 시간</p>
          </div>

          {/* 생산적인 요일 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">최고 생산성</span>
            </div>
            <p className="text-lg font-semibold">{data.mostProductiveDay}</p>
            <p className="text-xs text-gray-500 mt-1">가장 많이 학습하는 요일</p>
          </div>

          {/* 효율성 등급 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">집중도 등급</span>
            </div>
            <p className={`text-2xl font-bold ${efficiencyGrade.color}`}>
              {efficiencyGrade.grade}
            </p>
            <p className="text-xs text-gray-500 mt-1">{efficiencyGrade.description}</p>
          </div>
        </div>

        {/* 세션 통계 */}
        {data.sessionStats && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-3">세션 통계</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(data.sessionStats.avgSessionLength)}분
                </p>
                <p className="text-xs text-gray-500">평균 세션</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(data.sessionStats.medianSessionLength)}분
                </p>
                <p className="text-xs text-gray-500">중간값</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.sessionStats.maxSessionLength}분
                </p>
                <p className="text-xs text-gray-500">최장 세션</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 인사이트 카드 */}
      {data.insights && data.insights.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">학습 인사이트</h3>
          
          <div className="space-y-3">
            {data.insights.slice(0, 5).map((insight) => {
              const Icon = getInsightIcon(insight.type);
              const colorClass = getInsightColor(insight.type);
              
              return (
                <div key={insight.id} className="flex gap-3">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}