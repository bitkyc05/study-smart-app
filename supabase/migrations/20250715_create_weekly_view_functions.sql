-- 1. 일별 학습 시간 집계 함수
create or replace function get_daily_study_summary(
    start_date date,
    end_date date,
    p_user_id uuid
)
returns table (
    day date, 
    total_minutes numeric,
    session_count integer,
    subjects text[]
) as $$
begin
    return query
    select
        date_trunc('day', s.start_time at time zone 'utc')::date as day,
        round(sum(s.duration_seconds) / 60.0, 2) as total_minutes,
        count(*)::integer as session_count,
        coalesce(array_agg(distinct sub.name) filter (where sub.name is not null), '{}') as subjects
    from
        study_sessions s
        left join subjects sub on s.subject_id = sub.id
    where
        s.user_id = p_user_id and
        s.start_time >= start_date and
        s.start_time < (end_date + interval '1 day')
    group by
        date_trunc('day', s.start_time at time zone 'utc')
    order by
        day;
end;
$$ language plpgsql security definer;

-- 2. 시간대별 학습 패턴 분석 함수
create or replace function get_hourly_study_pattern(
    start_date date,
    end_date date,
    p_user_id uuid
)
returns table (
    day_of_week integer,
    hour integer,
    total_minutes numeric,
    session_count integer
) as $$
begin
    return query
    select
        extract(dow from s.start_time at time zone 'utc')::integer as day_of_week,
        extract(hour from s.start_time at time zone 'utc')::integer as hour,
        round(sum(s.duration_seconds) / 60.0, 2) as total_minutes,
        count(*)::integer as session_count
    from
        study_sessions s
    where
        s.user_id = p_user_id and
        s.start_time >= start_date and
        s.start_time < (end_date + interval '1 day')
    group by
        extract(dow from s.start_time at time zone 'utc'),
        extract(hour from s.start_time at time zone 'utc')
    order by
        day_of_week, hour;
end;
$$ language plpgsql security definer;

-- 3. 주간 비교 데이터 함수
create or replace function get_weekly_comparison(
    week_start date,
    p_user_id uuid
)
returns table (
    week_offset integer,
    day_of_week integer,
    total_minutes numeric
) as $$
begin
    return query
    select
        case 
            when s.start_time >= week_start then 0  -- current week
            else -1  -- previous week
        end as week_offset,
        extract(dow from s.start_time at time zone 'utc')::integer as day_of_week,
        round(sum(s.duration_seconds) / 60.0, 2) as total_minutes
    from
        study_sessions s
    where
        s.user_id = p_user_id and
        s.start_time >= (week_start - interval '7 days') and
        s.start_time < (week_start + interval '7 days')
    group by
        week_offset,
        extract(dow from s.start_time at time zone 'utc')
    order by
        week_offset, day_of_week;
end;
$$ language plpgsql security definer;

-- 4. 월간 캘린더 데이터 함수
create or replace function get_monthly_calendar_data(
    year integer,
    month integer,
    p_user_id uuid
)
returns table (
    date date,
    total_minutes numeric,
    session_count integer,
    subjects text[]
) as $$
declare
    start_date date;
    end_date date;
begin
    start_date := make_date(year, month, 1);
    end_date := (start_date + interval '1 month')::date;
    
    return query
    select
        date_trunc('day', s.start_time at time zone 'utc')::date as date,
        round(sum(s.duration_seconds) / 60.0, 2) as total_minutes,
        count(*)::integer as session_count,
        coalesce(array_agg(distinct sub.name) filter (where sub.name is not null), '{}') as subjects
    from
        study_sessions s
        left join subjects sub on s.subject_id = sub.id
    where
        s.user_id = p_user_id and
        s.start_time >= start_date and
        s.start_time < end_date
    group by
        date_trunc('day', s.start_time at time zone 'utc')
    order by
        date;
end;
$$ language plpgsql security definer;

-- 5. 학습 통계 요약 함수
create or replace function get_study_insights(
    start_date date,
    end_date date,
    p_user_id uuid
)
returns table (
    total_minutes numeric,
    total_sessions integer,
    study_days integer,
    avg_session_minutes numeric,
    most_studied_subject text,
    most_productive_hour integer,
    longest_session_minutes numeric
) as $$
begin
    return query
    with session_stats as (
        select
            s.duration_seconds,
            s.start_time,
            sub.name as subject_name
        from
            study_sessions s
            left join subjects sub on s.subject_id = sub.id
        where
            s.user_id = p_user_id and
            s.start_time >= start_date and
            s.start_time < (end_date + interval '1 day')
    ),
    subject_totals as (
        select
            subject_name,
            sum(duration_seconds) as total_seconds
        from session_stats
        where subject_name is not null
        group by subject_name
        order by total_seconds desc
        limit 1
    ),
    hourly_totals as (
        select
            extract(hour from start_time at time zone 'utc')::integer as hour,
            sum(duration_seconds) as total_seconds
        from session_stats
        group by hour
        order by total_seconds desc
        limit 1
    )
    select
        round(sum(ss.duration_seconds) / 60.0, 2) as total_minutes,
        count(*)::integer as total_sessions,
        count(distinct date_trunc('day', ss.start_time))::integer as study_days,
        round(avg(ss.duration_seconds) / 60.0, 2) as avg_session_minutes,
        st.subject_name as most_studied_subject,
        ht.hour as most_productive_hour,
        round(max(ss.duration_seconds) / 60.0, 2) as longest_session_minutes
    from
        session_stats ss
        cross join (select subject_name from subject_totals limit 1) st
        cross join (select hour from hourly_totals limit 1) ht
    group by
        st.subject_name,
        ht.hour;
end;
$$ language plpgsql security definer;

-- Grant execute permissions to authenticated users
grant execute on function get_daily_study_summary to authenticated;
grant execute on function get_hourly_study_pattern to authenticated;
grant execute on function get_weekly_comparison to authenticated;
grant execute on function get_monthly_calendar_data to authenticated;
grant execute on function get_study_insights to authenticated;