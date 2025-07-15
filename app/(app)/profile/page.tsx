import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { ProfileView } from '@/components/profile/ProfileView';
import { calculateLevel } from '@/lib/level-calculator';
import { 
  analyzeTimePattern, 
  analyzeDayPattern, 
  calculateConsistencyScore,
  analyzeTrend,
  generateInsights
} from '@/lib/analytics-engine';

async function getProfileData() {
  const supabase = await getServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // 모든 데이터를 병렬로 가져오기
  const [
    profileResult,
    statsResult,
    trendResult,
    subjectResult,
    patternResult,
    achievementsResult
  ] = await Promise.all([
    // 사용자 프로필 정보
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    
    // 종합 통계
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_user_profile_stats', { p_user_id: user.id }),
    
    // 월별 추세
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_monthly_study_trend', { p_user_id: user.id }),
    
    // 과목별 분석
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_subject_analysis', { p_user_id: user.id }),
    
    // 학습 패턴
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_learning_pattern_analysis', { p_user_id: user.id }),
    
    // 업적 및 뱃지
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).rpc('get_user_achievements', { p_user_id: user.id })
  ]);

  if (profileResult.error) {
    console.error('Profile fetch error:', profileResult.error);
    redirect('/login');
  }

  // 디버깅을 위한 로그
  console.log('Profile Stats Result:', statsResult.data);
  
  // 레벨 정보 계산
  const totalMinutes = statsResult.data?.totalMinutes || 0;
  const levelInfo = calculateLevel(totalMinutes);

  // 학습 패턴 분석
  const patternData = patternResult.data || {};
  const preferredTime = analyzeTimePattern(patternData.hourlyPattern || []);
  const mostProductiveDay = analyzeDayPattern(patternData.dayPattern || []);
  
  // 일관성 점수 계산
  const stats = statsResult.data || {};
  const consistencyScore = calculateConsistencyScore(
    stats.totalStudyDays || 0,
    30, // 최근 30일 기준
    stats.currentStreak || 0
  );

  // 월별 추세 분석
  const monthlyData = trendResult.data || [];
  const monthlyTrend = analyzeTrend(
    monthlyData.map((m: any) => ({ totalHours: m.totalHours || 0 }))
  );

  // 인사이트 생성
  const insights = generateInsights({
    totalHours: totalMinutes / 60,
    currentStreak: stats.currentStreak || 0,
    avgSessionLength: patternData.sessionStats?.avgSessionLength || 0,
    preferredTime,
    mostProductiveDay,
    consistencyScore,
    focusScore: 70, // 임시값
    monthlyTrend
  });

  return {
    user: {
      ...profileResult.data,
      email: user.email
    },
    stats: {
      ...stats,
      ...levelInfo
    },
    monthlyTrend: trendResult.data || [],
    subjectAnalysis: subjectResult.data || [],
    learningPattern: {
      ...patternData,
      preferredTime,
      mostProductiveDay,
      insights
    },
    achievements: achievementsResult.data || []
  };
}

export default async function ProfilePage() {
  const data = await getProfileData();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <ProfileView data={data} />
    </div>
  );
}