'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { PomodoroTimer } from '@/components/pomodoro/PomodoroTimer'
import { createClient } from '@/lib/supabase/client'
import { usePomodoroStore } from '@/store/usePomodoroStore'

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
  const [expandedSubjects, setExpandedSubjects] = useState<Set<number | 'etc'>>(new Set())
  
  // Get timer state and sessionType to disable dropdown during study
  const timerState = usePomodoroStore(state => state.state)
  const sessionType = usePomodoroStore(state => state.sessionType)

  useEffect(() => {
    fetchSubjects()
    fetchTodaySessions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      // Set "Etc" as default selected subject
      const etcSubject = data.find(s => s.name === 'Etc')
      if (etcSubject && selectedSubjectId === null) {
        setSelectedSubjectId(etcSubject.id)
      }
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
      .eq('session_type', 'study')
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
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatCompletedTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Group sessions by subject
  const groupedSessions = todaySessions.reduce((acc, session) => {
    const key = session.subject_id || 'etc'
    if (!acc[key]) {
      acc[key] = {
        sessions: [],
        totalTime: 0,
        subject: session.subjects || { name: 'Etc', color_hex: '#9E9E9E' }
      }
    }
    acc[key].sessions.push(session)
    acc[key].totalTime += session.duration_seconds
    return acc
  }, {} as Record<number | 'etc', { sessions: Session[], totalTime: number, subject: { name: string, color_hex: string | null } }>)

  const toggleExpanded = (subjectId: number | 'etc') => {
    setExpandedSubjects(prev => {
      const next = new Set(prev)
      if (next.has(subjectId)) {
        next.delete(subjectId)
      } else {
        next.add(subjectId)
      }
      return next
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Subject Selection */}
      <Card>
        <h2 className="font-serif text-heading-lg text-text-primary mb-4">
          Select Subject
        </h2>
        {/* Show warning when timer is running */}
        {sessionType === 'study' && timerState !== 'idle' && (
          <div className="mb-4 p-3 bg-warning-light/20 border border-warning/30 rounded-lg">
            <p className="text-body-sm text-warning-dark">
              ⚠️ Subject cannot be changed while studying
            </p>
          </div>
        )}
        <div className="max-w-md mx-auto">
          {isLoading ? (
            <div className="text-text-secondary">Loading...</div>
          ) : (
            <div className="relative">
              <select
                value={selectedSubjectId || ''}
                onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : null)}
                disabled={sessionType === 'study' && timerState !== 'idle'}
                className={`w-full px-4 py-3 pr-10 rounded-lg border-2 ${
                  sessionType === 'study' && timerState !== 'idle' 
                    ? 'border-accent opacity-50 cursor-not-allowed bg-accent-light' 
                    : 'border-accent hover:border-accent-focus focus:border-accent-focus cursor-pointer bg-background'
                } focus:outline-none appearance-none text-text-primary text-center font-serif text-heading-md`}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {selectedSubjectId !== null && (
                <div 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
                  style={{ backgroundColor: subjects.find(s => s.id === selectedSubjectId)?.color_hex || '#5D737E' }}
                />
              )}
            </div>
          )}
        </div>
      </Card>

      {/* 타이머 */}
      <PomodoroTimer subjectId={selectedSubjectId?.toString()} />
      
      {/* Today's Sessions */}
      <Card>
        <h3 className="font-serif text-heading-lg mb-4 text-text-primary">
          Today&apos;s Study Sessions
        </h3>
        {todaySessions.length === 0 ? (
          <p className="text-text-secondary text-center py-8">
            No study sessions yet
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedSessions).map(([subjectId, data], index) => {
              const isExpanded = expandedSubjects.has(subjectId as number | 'etc')
              return (
                <div key={subjectId}>
                  {/* Summary Row */}
                  <div 
                    className={`flex items-center justify-between py-3 cursor-pointer hover:bg-accent-light rounded-lg px-2 -mx-2 ${
                      index < Object.keys(groupedSessions).length - 1 && !isExpanded ? 'border-b border-accent' : ''
                    }`}
                    onClick={() => toggleExpanded(subjectId as number | 'etc')}
                  >
                    <div className="flex items-center space-x-3">
                      <svg 
                        className={`w-4 h-4 text-text-secondary transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: data.subject.color_hex || '#9E9E9E' }}
                      />
                      <div>
                        <p className="text-body-md font-medium text-text-primary">
                          {data.subject.name}
                        </p>
                        <p className="text-caption text-text-secondary">
                          {data.sessions.length} session{data.sessions.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-body-md font-medium text-text-primary">
                      {formatTime(data.totalTime)}
                    </span>
                  </div>
                  
                  {/* Expanded Sessions */}
                  {isExpanded && (
                    <div className="ml-8 mt-2 space-y-2 mb-4">
                      {data.sessions.map((session, sessionIndex) => (
                        <div 
                          key={session.id}
                          className={`flex items-center justify-between py-2 px-2 rounded ${
                            sessionIndex < data.sessions.length - 1 ? 'border-b border-accent/50' : ''
                          }`}
                        >
                          <p className="text-caption text-text-secondary">
                            {formatCompletedTime(session.end_time)}
                          </p>
                          <span className="text-body-sm text-text-primary">
                            {formatTime(session.duration_seconds)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}