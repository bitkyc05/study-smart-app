-- Update RPC functions to support user timezone

-- 1. Update get_daily_study_summary to support timezone
drop function if exists get_daily_study_summary(date, date, uuid);
create or replace function get_daily_study_summary(
    start_date date,
    end_date date,
    p_user_id uuid,
    p_timezone text default 'UTC'
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
        date_trunc('day', s.start_time at time zone p_timezone)::date as day,
        round(sum(s.duration_seconds) / 60.0, 2) as total_minutes,
        count(*)::integer as session_count,
        coalesce(array_agg(distinct sub.name) filter (where sub.name is not null), '{}') as subjects
    from
        study_sessions s
        left join subjects sub on s.subject_id = sub.id
    where
        s.user_id = p_user_id and
        date_trunc('day', s.start_time at time zone p_timezone) >= start_date and
        date_trunc('day', s.start_time at time zone p_timezone) <= end_date
    group by
        date_trunc('day', s.start_time at time zone p_timezone)
    order by
        day;
end;
$$ language plpgsql security definer;

-- 2. Update get_hourly_study_pattern to support timezone
drop function if exists get_hourly_study_pattern(date, date, uuid);
create or replace function get_hourly_study_pattern(
    start_date date,
    end_date date,
    p_user_id uuid,
    p_timezone text default 'UTC'
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
        extract(dow from s.start_time at time zone p_timezone)::integer as day_of_week,
        extract(hour from s.start_time at time zone p_timezone)::integer as hour,
        round(sum(s.duration_seconds) / 60.0, 2) as total_minutes,
        count(*)::integer as session_count
    from
        study_sessions s
    where
        s.user_id = p_user_id and
        date_trunc('day', s.start_time at time zone p_timezone) >= start_date and
        date_trunc('day', s.start_time at time zone p_timezone) <= end_date
    group by
        extract(dow from s.start_time at time zone p_timezone),
        extract(hour from s.start_time at time zone p_timezone)
    order by
        day_of_week, hour;
end;
$$ language plpgsql security definer;

-- 3. Update get_weekly_comparison to support timezone
drop function if exists get_weekly_comparison(date, uuid);
create or replace function get_weekly_comparison(
    week_start date,
    p_user_id uuid,
    p_timezone text default 'UTC'
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
            when date_trunc('day', s.start_time at time zone p_timezone)::date >= week_start then 0  -- current week
            else -1  -- previous week
        end as week_offset,
        extract(dow from s.start_time at time zone p_timezone)::integer as day_of_week,
        round(sum(s.duration_seconds) / 60.0, 2) as total_minutes
    from
        study_sessions s
    where
        s.user_id = p_user_id and
        date_trunc('day', s.start_time at time zone p_timezone)::date >= (week_start - interval '7 days') and
        date_trunc('day', s.start_time at time zone p_timezone)::date < (week_start + interval '7 days')
    group by
        week_offset,
        extract(dow from s.start_time at time zone p_timezone)
    order by
        week_offset, day_of_week;
end;
$$ language plpgsql security definer;

-- 4. Update get_study_insights to support timezone
drop function if exists get_study_insights(date, date, uuid);
create or replace function get_study_insights(
    start_date date,
    end_date date,
    p_user_id uuid,
    p_timezone text default 'UTC'
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
            s.id,
            s.duration_seconds,
            s.subject_id,
            extract(hour from s.start_time at time zone p_timezone)::integer as hour_of_day,
            date_trunc('day', s.start_time at time zone p_timezone)::date as study_date
        from study_sessions s
        where
            s.user_id = p_user_id and
            date_trunc('day', s.start_time at time zone p_timezone) >= start_date and
            date_trunc('day', s.start_time at time zone p_timezone) <= end_date
    ),
    subject_stats as (
        select
            sub.name,
            sum(ss.duration_seconds) as total_seconds
        from session_stats ss
        left join subjects sub on ss.subject_id = sub.id
        group by sub.name
        order by total_seconds desc
        limit 1
    ),
    hour_stats as (
        select
            hour_of_day,
            sum(duration_seconds) as total_seconds
        from session_stats
        group by hour_of_day
        order by total_seconds desc
        limit 1
    )
    select
        round(sum(ss.duration_seconds) / 60.0, 2) as total_minutes,
        count(*)::integer as total_sessions,
        count(distinct ss.study_date)::integer as study_days,
        round(avg(ss.duration_seconds) / 60.0, 2) as avg_session_minutes,
        coalesce((select name from subject_stats), 'None') as most_studied_subject,
        coalesce((select hour_of_day from hour_stats), 0) as most_productive_hour,
        round(max(ss.duration_seconds) / 60.0, 2) as longest_session_minutes
    from session_stats ss;
end;
$$ language plpgsql security definer;

-- Grant permissions
grant execute on function get_daily_study_summary(date, date, uuid, text) to authenticated;
grant execute on function get_hourly_study_pattern(date, date, uuid, text) to authenticated;
grant execute on function get_weekly_comparison(date, uuid, text) to authenticated;
grant execute on function get_study_insights(date, date, uuid, text) to authenticated;