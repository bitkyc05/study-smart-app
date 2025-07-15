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
      startedAt,
      status,
      pomodoroSessionSequence,
      pomodoroCycleId
    } = body

    // 필수 필드 검증
    if (!sessionType) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      )
    }

    // 진행 중인 세션 생성인 경우
    if (status === 'in_progress') {
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          subject_id: subjectId || null,
          session_type: sessionType,
          status: 'in_progress',
          started_at: now,
          start_time: now, // 레거시 호환성
          planned_duration_seconds: settingDuration || 25 * 60, // 기본값 25분
          duration_seconds: 0, // 아직 진행되지 않음
          end_time: now, // 임시값, 나중에 업데이트됨
          pomodoro_session_sequence: pomodoroSessionSequence || null,
          pomodoro_cycle_id: pomodoroCycleId || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating session:', error)
        return NextResponse.json(
          { error: 'Failed to create session' }, 
          { status: 500 }
        )
      }

      return NextResponse.json({ data }, { status: 201 })
    }
    
    // 기존 로직: 완료된 세션 저장
    if (!duration) {
      return NextResponse.json(
        { error: 'Duration is required for completed sessions' }, 
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        subject_id: subjectId || null,
        session_type: sessionType,
        status: 'completed',
        duration_seconds: duration,
        actual_duration: duration,
        planned_duration_seconds: settingDuration || duration,
        start_time: startedAt || new Date(Date.now() - duration * 1000).toISOString(),
        end_time: new Date().toISOString(),
        started_at: startedAt || new Date(Date.now() - duration * 1000).toISOString(),
        ended_at: new Date().toISOString()
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
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 쿼리 빌드
    let query = supabase
      .from('study_sessions')
      .select(`
        *,
        subjects (
          id,
          name,
          color_hex
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
    
    // 상태 필터
    if (status) {
      query = query.eq('status', status)
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

export async function PATCH(request: NextRequest) {
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
      sessionId,
      status,
      actualDuration,
      overtimeDuration,
      notes
    } = body

    // 필수 필드 검증
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' }, 
        { status: 400 }
      )
    }

    // 업데이트 데이터 준비
    const updateData: {
      status?: string
      ended_at?: string
      end_time?: string
      actual_duration?: number
      duration_seconds?: number
      overtime_duration?: number
      notes?: string
    } = {}
    
    if (status) {
      updateData.status = status
      
      // 세션 완료 시 추가 처리
      if (status === 'completed' || status === 'interrupted') {
        updateData.ended_at = new Date().toISOString()
        updateData.end_time = updateData.ended_at // 레거시 호환성
        
        if (actualDuration !== undefined) {
          updateData.actual_duration = actualDuration
          updateData.duration_seconds = actualDuration
        }
        
        if (overtimeDuration !== undefined) {
          updateData.overtime_duration = overtimeDuration
        }
      }
    }
    
    if (notes !== undefined) {
      updateData.notes = notes
    }

    // 세션 업데이트
    const { data, error } = await supabase
      .from('study_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id) // 사용자 소유권 확인
      .select()
      .single()

    if (error) {
      console.error('Error updating session:', error)
      return NextResponse.json(
        { error: 'Failed to update session' }, 
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Session not found' }, 
        { status: 404 }
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