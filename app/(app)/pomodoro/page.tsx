'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { PomodoroTimer } from '@/components/pomodoro/PomodoroTimer'
import { createClient } from '@/lib/supabase/client'

interface Subject {
  id: number
  name: string
  color_hex: string | null
}

interface Session {
  id: number
  subject_id: number | null
  duration_seconds: number
  end_time: string
  subjects?: {
    name: string
    color_hex: string | null
  }
}

export default function PomodoroPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [todaySessions, setTodaySessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSubjects()
    fetchTodaySessions()
  }, [])

  const fetchSubjects = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    if (!error && data) {
      setSubjects(data)
    }
    setIsLoading(false)
  }

  const fetchTodaySessions = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('study_sessions')
      .select(`
        id,
        subject_id,
        duration_seconds,
        end_time,
        subjects (
          name,
          color_hex
        )
      `)
      .eq('user_id', user.id)
      .gte('end_time', today.toISOString())
      .order('end_time', { ascending: false })

    if (!error && data) {
      setTodaySessions(data as Session[])
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`
    }
    return `${minutes}분`
  }

  const formatCompletedTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 과목 선택 */}
      <Card>
        <h2 className="font-serif text-heading-lg text-text-primary mb-4">
          과목 선택
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {isLoading ? (
            <div className="text-text-secondary">로딩 중...</div>
          ) : subjects.length === 0 ? (
            <div className="text-text-secondary col-span-full">
              과목을 먼저 추가해주세요
            </div>
          ) : (
            <>
              <button
                onClick={() => setSelectedSubjectId(null)}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedSubjectId === null
                    ? 'border-accent-focus bg-accent-light'
                    : 'border-accent hover:border-accent-focus'
                }`}
              >
                <span className="text-body-md">선택 안함</span>
              </button>
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubjectId(subject.id)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    selectedSubjectId === subject.id
                      ? 'border-accent-focus bg-accent-light'
                      : 'border-accent hover:border-accent-focus'
                  }`}
                >
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: subject.color_hex || '#5D737E' }}
                  />
                  <span className="text-body-md">{subject.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </Card>

      {/* 타이머 */}
      <PomodoroTimer subjectId={selectedSubjectId?.toString()} />
      
      {/* 오늘의 세션 */}
      <Card>
        <h3 className="font-sans text-heading-lg mb-4 text-text-primary">
          오늘의 학습 기록
        </h3>
        {todaySessions.length === 0 ? (
          <p className="text-text-secondary text-center py-8">
            아직 학습 기록이 없습니다
          </p>
        ) : (
          <div className="space-y-3">
            {todaySessions.map((session, index) => (
              <div 
                key={session.id}
                className={`flex items-center justify-between py-3 ${
                  index < todaySessions.length - 1 ? 'border-b border-accent' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: session.subjects?.color_hex || '#5D737E' }}
                  />
                  <div>
                    <p className="text-body-md font-medium text-text-primary">
                      {session.subjects?.name || '과목 없음'}
                    </p>
                    <p className="text-caption text-text-secondary">
                      {formatCompletedTime(session.end_time)} 완료
                    </p>
                  </div>
                </div>
                <span className="text-body-md text-text-primary">
                  {formatTime(session.duration_seconds)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}