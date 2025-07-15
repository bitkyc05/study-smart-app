-- ================================================
-- 프로필 페이지를 위한 데이터베이스 집계 함수들
-- ================================================

-- 1. 사용자 종합 통계 가져오기
CREATE OR REPLACE FUNCTION get_user_profile_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH user_stats AS (
    SELECT 
      COUNT(DISTINCT DATE(created_at)) as total_study_days,
      COALESCE(SUM(duration), 0) as total_minutes,
      COUNT(*) as total_sessions,
      MAX(created_at)::date as last_study_date
    FROM study_sessions
    WHERE user_id = p_user_id 
      AND session_type = 'study'
      AND end_time IS NOT NULL
  ),
  streak_calc AS (
    -- 연속 학습일 계산
    WITH study_dates AS (
      SELECT DISTINCT DATE(created_at) as study_date
      FROM study_sessions
      WHERE user_id = p_user_id 
        AND session_type = 'study'
        AND end_time IS NOT NULL
      ORDER BY study_date DESC
    ),
    date_groups AS (
      SELECT 
        study_date,
        study_date - (ROW_NUMBER() OVER (ORDER BY study_date))::integer as grp
      FROM study_dates
    )
    SELECT 
      COUNT(*) as current_streak
    FROM date_groups
    WHERE grp = (
      SELECT grp 
      FROM date_groups 
      WHERE study_date = CURRENT_DATE 
        OR study_date = CURRENT_DATE - 1
      LIMIT 1
    )
  ),
  badge_count AS (
    SELECT COUNT(*) as total_badges
    FROM user_badges
    WHERE user_id = p_user_id
  )
  SELECT json_build_object(
    'totalStudyDays', COALESCE(us.total_study_days, 0),
    'totalMinutes', COALESCE(us.total_minutes, 0),
    'totalSessions', COALESCE(us.total_sessions, 0),
    'currentStreak', COALESCE(sc.current_streak, 0),
    'lastStudyDate', us.last_study_date,
    'totalBadges', COALESCE(bc.total_badges, 0),
    'memberSince', (SELECT created_at FROM profiles WHERE id = p_user_id)
  ) INTO v_result
  FROM user_stats us
  CROSS JOIN (SELECT COALESCE(current_streak, 0) as current_streak FROM streak_calc) sc
  CROSS JOIN (SELECT COALESCE(total_badges, 0) as total_badges FROM badge_count) bc;
  
  RETURN v_result;
END;
$$;

-- 2. 월별 학습 추세 데이터 (최근 6개월)
CREATE OR REPLACE FUNCTION get_monthly_study_trend(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH monthly_data AS (
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      SUM(duration) as total_minutes,
      COUNT(*) as session_count,
      COUNT(DISTINCT DATE(created_at)) as study_days,
      COUNT(DISTINCT subject_id) as subjects_studied
    FROM study_sessions
    WHERE user_id = p_user_id 
      AND session_type = 'study'
      AND end_time IS NOT NULL
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month
  ),
  monthly_subjects AS (
    SELECT 
      DATE_TRUNC('month', ss.created_at) as month,
      sub.name as subject_name,
      SUM(ss.duration) as subject_minutes
    FROM study_sessions ss
    JOIN subjects sub ON ss.subject_id = sub.id
    WHERE ss.user_id = p_user_id 
      AND ss.session_type = 'study'
      AND ss.end_time IS NOT NULL
      AND ss.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
    GROUP BY DATE_TRUNC('month', ss.created_at), sub.name
  )
  SELECT json_agg(
    json_build_object(
      'month', to_char(md.month, 'YYYY-MM'),
      'totalMinutes', COALESCE(md.total_minutes, 0),
      'totalHours', ROUND(COALESCE(md.total_minutes, 0) / 60.0, 1),
      'avgDailyHours', ROUND(COALESCE(md.total_minutes, 0) / 60.0 / GREATEST(md.study_days, 1), 1),
      'sessionCount', md.session_count,
      'studyDays', md.study_days,
      'subjectsCount', md.subjects_studied,
      'subjects', COALESCE(
        (SELECT json_object_agg(subject_name, subject_minutes)
         FROM monthly_subjects ms
         WHERE ms.month = md.month
        ), '{}'::json
      )
    )
    ORDER BY md.month
  ) INTO v_result
  FROM monthly_data md;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 3. 과목별 분석 데이터
CREATE OR REPLACE FUNCTION get_subject_analysis(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH subject_stats AS (
    SELECT 
      sub.id,
      sub.name,
      sub.color_hex,
      COALESCE(SUM(ss.duration), 0) as total_minutes,
      COUNT(ss.*) as session_count,
      COUNT(DISTINCT DATE(ss.created_at)) as study_days,
      MAX(ss.created_at) as last_studied
    FROM subjects sub
    LEFT JOIN study_sessions ss ON sub.id = ss.subject_id 
      AND ss.user_id = p_user_id 
      AND ss.session_type = 'study'
      AND ss.end_time IS NOT NULL
    WHERE sub.user_id = p_user_id
    GROUP BY sub.id, sub.name, sub.color_hex
  ),
  total_time AS (
    SELECT SUM(total_minutes) as grand_total
    FROM subject_stats
  ),
  weekly_consistency AS (
    -- 주간 규칙성 계산 (최근 4주)
    SELECT 
      subject_id,
      COUNT(DISTINCT DATE_TRUNC('week', created_at)) as weeks_studied
    FROM study_sessions
    WHERE user_id = p_user_id 
      AND session_type = 'study'
      AND end_time IS NOT NULL
      AND created_at >= CURRENT_DATE - INTERVAL '4 weeks'
    GROUP BY subject_id
  )
  SELECT json_agg(
    json_build_object(
      'id', ss.id,
      'subject', ss.name,
      'color', ss.color_hex,
      'totalMinutes', ss.total_minutes,
      'hours', ROUND(ss.total_minutes / 60.0, 1),
      'percentage', CASE 
        WHEN tt.grand_total > 0 
        THEN ROUND((ss.total_minutes::numeric / tt.grand_total) * 100, 1)
        ELSE 0
      END,
      'sessionCount', ss.session_count,
      'studyDays', ss.study_days,
      'lastStudied', ss.last_studied,
      'consistency', ROUND(COALESCE(wc.weeks_studied, 0) * 25.0, 0), -- 4주 중 몇 주 학습했는지 (%)
      'efficiency', CASE 
        WHEN ss.session_count > 0 
        THEN ROUND(ss.total_minutes::numeric / ss.session_count, 0)
        ELSE 0
      END -- 평균 세션 길이 (분)
    )
    ORDER BY ss.total_minutes DESC
  ) INTO v_result
  FROM subject_stats ss
  CROSS JOIN total_time tt
  LEFT JOIN weekly_consistency wc ON ss.id = wc.subject_id
  WHERE ss.total_minutes > 0;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 4. 시간대별 학습 패턴 분석
CREATE OR REPLACE FUNCTION get_learning_pattern_analysis(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH hourly_pattern AS (
    SELECT 
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') as hour,
      COUNT(*) as session_count,
      SUM(duration) as total_minutes,
      AVG(duration) as avg_duration
    FROM study_sessions
    WHERE user_id = p_user_id 
      AND session_type = 'study'
      AND end_time IS NOT NULL
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC')
  ),
  day_pattern AS (
    SELECT 
      EXTRACT(DOW FROM created_at AT TIME ZONE 'UTC') as day_of_week,
      COUNT(*) as session_count,
      SUM(duration) as total_minutes
    FROM study_sessions
    WHERE user_id = p_user_id 
      AND session_type = 'study'
      AND end_time IS NOT NULL
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY EXTRACT(DOW FROM created_at AT TIME ZONE 'UTC')
  ),
  session_stats AS (
    SELECT 
      AVG(duration) as avg_session_length,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) as median_session_length,
      MAX(duration) as max_session_length
    FROM study_sessions
    WHERE user_id = p_user_id 
      AND session_type = 'study'
      AND end_time IS NOT NULL
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
  )
  SELECT json_build_object(
    'hourlyPattern', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'hour', hour,
          'sessionCount', session_count,
          'totalMinutes', total_minutes,
          'avgDuration', ROUND(avg_duration, 0)
        )
        ORDER BY hour
      ) FROM hourly_pattern), '[]'::json
    ),
    'dayPattern', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'dayOfWeek', day_of_week,
          'sessionCount', session_count,
          'totalMinutes', total_minutes
        )
        ORDER BY day_of_week
      ) FROM day_pattern), '[]'::json
    ),
    'sessionStats', (
      SELECT json_build_object(
        'avgSessionLength', ROUND(avg_session_length, 0),
        'medianSessionLength', ROUND(median_session_length, 0),
        'maxSessionLength', max_session_length
      ) FROM session_stats
    ),
    'preferredTime', (
      SELECT hour FROM hourly_pattern ORDER BY total_minutes DESC LIMIT 1
    ),
    'mostProductiveDay', (
      SELECT day_of_week FROM day_pattern ORDER BY total_minutes DESC LIMIT 1
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- 5. 뱃지 테이블 생성 (아직 없는 경우)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, badge_id)
);

-- RLS 정책 설정
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage badges" ON user_badges
  FOR ALL USING (auth.uid() = user_id);

-- 6. 뱃지 및 업적 데이터 가져오기
CREATE OR REPLACE FUNCTION get_user_achievements(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_total_minutes INTEGER;
  v_total_sessions INTEGER;
  v_total_days INTEGER;
  v_current_streak INTEGER;
BEGIN
  -- 먼저 필요한 통계 가져오기
  SELECT 
    COALESCE(SUM(duration), 0),
    COUNT(*),
    COUNT(DISTINCT DATE(created_at))
  INTO v_total_minutes, v_total_sessions, v_total_days
  FROM study_sessions
  WHERE user_id = p_user_id 
    AND session_type = 'study'
    AND end_time IS NOT NULL;
  
  -- 연속 학습일 계산 (위 함수에서 가져온 로직 재사용)
  WITH study_dates AS (
    SELECT DISTINCT DATE(created_at) as study_date
    FROM study_sessions
    WHERE user_id = p_user_id 
      AND session_type = 'study'
      AND end_time IS NOT NULL
    ORDER BY study_date DESC
  ),
  date_groups AS (
    SELECT 
      study_date,
      study_date - (ROW_NUMBER() OVER (ORDER BY study_date))::integer as grp
    FROM study_dates
  )
  SELECT COUNT(*) INTO v_current_streak
  FROM date_groups
  WHERE grp = (
    SELECT grp 
    FROM date_groups 
    WHERE study_date = CURRENT_DATE 
      OR study_date = CURRENT_DATE - 1
    LIMIT 1
  );
  
  -- 뱃지 정의 및 진행률 계산
  WITH badge_definitions AS (
    SELECT * FROM (VALUES
      -- 마일스톤 뱃지
      ('first_session', '첫 학습 완료', '첫 번째 포모도로 세션을 완료했습니다', 'trophy', 'milestone', 
        CASE WHEN v_total_sessions >= 1 THEN 100 ELSE 0 END),
      ('10_hours', '10시간 달성', '총 10시간 학습을 완료했습니다', 'clock', 'milestone',
        LEAST(100, (v_total_minutes / 60.0 / 10.0) * 100)),
      ('50_hours', '50시간 달성', '총 50시간 학습을 완료했습니다', 'clock', 'milestone',
        LEAST(100, (v_total_minutes / 60.0 / 50.0) * 100)),
      ('100_hours', '100시간 달성', '총 100시간 학습을 완료했습니다', 'clock', 'milestone',
        LEAST(100, (v_total_minutes / 60.0 / 100.0) * 100)),
      ('500_hours', '500시간 달성', '총 500시간 학습을 완료했습니다', 'clock', 'milestone',
        LEAST(100, (v_total_minutes / 60.0 / 500.0) * 100)),
      
      -- 연속 학습 뱃지
      ('streak_7', '일주일 연속', '7일 연속 학습했습니다', 'zap', 'streak',
        LEAST(100, (v_current_streak / 7.0) * 100)),
      ('streak_30', '한 달 연속', '30일 연속 학습했습니다', 'zap', 'streak',
        LEAST(100, (v_current_streak / 30.0) * 100)),
      ('streak_100', '100일 연속', '100일 연속 학습했습니다', 'zap', 'streak',
        LEAST(100, (v_current_streak / 100.0) * 100)),
      
      -- 세션 수 뱃지
      ('100_sessions', '100회 달성', '100개의 포모도로 세션을 완료했습니다', 'target', 'milestone',
        LEAST(100, (v_total_sessions / 100.0) * 100)),
      ('500_sessions', '500회 달성', '500개의 포모도로 세션을 완료했습니다', 'target', 'milestone',
        LEAST(100, (v_total_sessions / 500.0) * 100)),
      ('1000_sessions', '1000회 달성', '1000개의 포모도로 세션을 완료했습니다', 'target', 'milestone',
        LEAST(100, (v_total_sessions / 1000.0) * 100))
    ) AS t(id, name, description, icon, category, progress)
  ),
  user_badge_status AS (
    SELECT 
      bd.*,
      ub.unlocked_at,
      CASE 
        WHEN ub.unlocked_at IS NOT NULL THEN 100
        ELSE bd.progress
      END as final_progress
    FROM badge_definitions bd
    LEFT JOIN user_badges ub ON ub.user_id = p_user_id AND ub.badge_id = bd.id
  )
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name,
      'description', description,
      'icon', icon,
      'category', category,
      'progress', final_progress,
      'unlockedAt', unlocked_at,
      'requirement', CASE
        WHEN id LIKE '%_hours' THEN REPLACE(id, '_hours', '') || '시간 학습'
        WHEN id LIKE 'streak_%' THEN REPLACE(id, 'streak_', '') || '일 연속 학습'
        WHEN id LIKE '%_sessions' THEN REPLACE(id, '_sessions', '') || '회 세션 완료'
        ELSE ''
      END
    )
    ORDER BY 
      CASE WHEN unlocked_at IS NOT NULL THEN 0 ELSE 1 END,
      final_progress DESC,
      id
  ) INTO v_result
  FROM user_badge_status;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_created 
  ON study_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_type_created 
  ON study_sessions(user_id, session_type, created_at);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id 
  ON user_badges(user_id);

-- 권한 부여
GRANT EXECUTE ON FUNCTION get_user_profile_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_study_trend(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subject_analysis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_learning_pattern_analysis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_achievements(UUID) TO authenticated;