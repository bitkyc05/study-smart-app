'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface SubjectData {
  id: string;
  subject: string;
  color: string;
  hours: number;
  percentage: number;
  efficiency: number;
  consistency: number;
  sessionCount: number;
  lastStudied: string;
}

interface SubjectRadarProps {
  data: SubjectData[];
}

export function SubjectRadar({ data }: SubjectRadarProps) {
  // 상위 5개 과목만 표시
  const topSubjects = data.slice(0, 5);

  // 레이더 차트용 데이터 변환
  const radarData = topSubjects.map(item => ({
    subject: item.subject,
    시간: Math.min(100, (item.hours / 100) * 100), // 100시간 기준 정규화
    효율성: Math.min(100, (item.efficiency / 30) * 100), // 30분 기준 정규화
    규칙성: item.consistency,
    숙련도: Math.min(100, Math.sqrt(item.hours) * 10) // 숙련도 계산
  }));

  const CustomTooltip = ({ active, payload }: { 
    active?: boolean; 
    payload?: Array<{
      dataKey?: string;
      value?: number;
      payload?: {
        subject: string;
      };
    }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data) return null;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-medium mb-2">{data.subject}</p>
          <div className="space-y-1 text-sm">
            <p>학습 시간: {Math.round(payload.find((p: { dataKey?: string; value?: number }) => p.dataKey === '시간')?.value || 0)}%</p>
            <p>효율성: {Math.round(payload.find((p: { dataKey?: string; value?: number }) => p.dataKey === '효율성')?.value || 0)}%</p>
            <p>규칙성: {Math.round(payload.find((p: { dataKey?: string; value?: number }) => p.dataKey === '규칙성')?.value || 0)}%</p>
            <p>숙련도: {Math.round(payload.find((p: { dataKey?: string; value?: number }) => p.dataKey === '숙련도')?.value || 0)}%</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // 과목별 세부 정보
  const getSubjectInsight = (subject: SubjectData) => {
    if (subject.hours >= 100) return '마스터 수준';
    if (subject.hours >= 50) return '숙련됨';
    if (subject.hours >= 20) return '익숙함';
    if (subject.hours >= 10) return '학습 중';
    return '시작 단계';
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">과목별 학습 분석</h3>
      
      {data.length > 0 ? (
        <>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid 
                  gridType="polygon"
                  radialLines={true}
                />
                <PolarAngleAxis 
                  dataKey="subject"
                  tick={{ fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                />
                <Radar
                  name="시간"
                  dataKey="시간"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.2}
                />
                <Radar
                  name="효율성"
                  dataKey="효율성"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.2}
                />
                <Radar
                  name="규칙성"
                  dataKey="규칙성"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.2}
                />
                <Radar
                  name="숙련도"
                  dataKey="숙련도"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.2}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* 범례 */}
          <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>시간 투자</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>효율성</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span>규칙성</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full" />
              <span>숙련도</span>
            </div>
          </div>

          {/* 과목별 상세 정보 */}
          <div className="mt-6 pt-6 border-t space-y-3">
            <h4 className="text-sm font-medium text-gray-700 mb-3">과목별 현황</h4>
            {topSubjects.map((subject) => (
              <div key={subject.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="font-medium">{subject.subject}</span>
                  <span className="text-sm text-gray-500">
                    {getSubjectInsight(subject)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{Math.round(subject.hours)}시간</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({subject.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>아직 학습 데이터가 없습니다.</p>
          <p className="text-sm mt-2">학습을 시작하면 과목별 분석이 표시됩니다.</p>
        </div>
      )}
    </div>
  );
}