import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 요청 데이터 파싱
    const body = await request.json()
    const { 
      subjectId, 
      sessionType, 
      duration, 
      settingDuration,
      startedAt 
    } = body

    // 필수 필드 검증
    if (!sessionType || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      )
    }

    // 세션 저장
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        subject_id: subjectId || null,
        session_type: sessionType,
        duration_seconds: duration,
        planned_duration_seconds: settingDuration || duration,
        start_time: startedAt || new Date(Date.now() - duration * 1000).toISOString(),
        end_time: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving session:', error)
      return NextResponse.json(
        { error: 'Failed to save session' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // URL 파라미터 가져오기
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const subjectId = searchParams.get('subjectId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 쿼리 빌드
    let query = supabase
      .from('study_sessions')
      .select(`
        *,
        subjects (
          id,
          name,
          color
        )
      `)
      .eq('user_id', user.id)
      .order('end_time', { ascending: false })
      .limit(limit)

    // 날짜 필터
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      
      query = query
        .gte('end_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString())
    }

    // 과목 필터
    if (subjectId) {
      query = query.eq('subject_id', parseInt(subjectId))
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}