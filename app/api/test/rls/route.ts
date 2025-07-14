import { getServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface TestResult {
  success: boolean
  error?: string
  note?: string
}

interface TableTestResults {
  passed: boolean
  details: Record<string, TestResult>
}

interface RLSTestResults {
  currentUser: string
  tests: {
    profiles: TableTestResults
    subjects: TableTestResults
    study_sessions: TableTestResults
  }
}

// Service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  try {
    // Get current user
    const supabase = await getServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required to test RLS policies' 
      }, { status: 401 })
    }

    const testResults: RLSTestResults = {
      currentUser: user.email || '',
      tests: {
        profiles: { passed: false, details: {} },
        subjects: { passed: false, details: {} },
        study_sessions: { passed: false, details: {} }
      }
    }

    // Test 1: Profiles table RLS
    // 1.1 Can read own profile
    const { data: ownProfile, error: ownProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    testResults.tests.profiles.details['can_read_own_profile'] = {
      success: !ownProfileError && ownProfile !== null,
      error: ownProfileError?.message
    }

    // 1.2 Cannot read other profiles (using admin to create test data)
    // First, get all profiles using admin
    const { data: allProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .neq('id', user.id)
      .limit(1)
    
    if (allProfiles && allProfiles.length > 0) {
      const otherUserId = allProfiles[0].id
      const { data: otherProfile, error: otherProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single()
      
      testResults.tests.profiles.details['cannot_read_other_profiles'] = {
        success: otherProfile === null,
        error: otherProfileError?.message
      }
    } else {
      testResults.tests.profiles.details['cannot_read_other_profiles'] = {
        success: true,
        note: 'No other profiles to test against'
      }
    }

    // 1.3 Can update own profile
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', user.id)
    
    testResults.tests.profiles.details['can_update_own_profile'] = {
      success: !updateProfileError,
      error: updateProfileError?.message
    }

    // Test 2: Subjects table RLS
    // 2.1 Can create own subject
    const { data: newSubject, error: createSubjectError } = await supabase
      .from('subjects')
      .insert({
        user_id: user.id,
        name: 'RLS Test Subject',
        color_hex: '#FF0000'
      })
      .select()
      .single()
    
    testResults.tests.subjects.details['can_create_own_subject'] = {
      success: !createSubjectError && newSubject !== null,
      error: createSubjectError?.message
    }

    if (newSubject) {
      // 2.2 Can read own subject
      const { data: readSubject, error: readSubjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', newSubject.id)
        .single()
      
      testResults.tests.subjects.details['can_read_own_subject'] = {
        success: !readSubjectError && readSubject !== null,
        error: readSubjectError?.message
      }

      // 2.3 Can update own subject
      const { error: updateSubjectError } = await supabase
        .from('subjects')
        .update({ name: 'Updated RLS Test Subject' })
        .eq('id', newSubject.id)
      
      testResults.tests.subjects.details['can_update_own_subject'] = {
        success: !updateSubjectError,
        error: updateSubjectError?.message
      }

      // 2.4 Can delete own subject
      const { error: deleteSubjectError } = await supabase
        .from('subjects')
        .delete()
        .eq('id', newSubject.id)
      
      testResults.tests.subjects.details['can_delete_own_subject'] = {
        success: !deleteSubjectError,
        error: deleteSubjectError?.message
      }
    }

    // Test 3: Study sessions table RLS
    // 3.1 Can create own session
    const { data: newSession, error: createSessionError } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        session_type: 'pomodoro',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 1000 * 60 * 25).toISOString(),
        duration_seconds: 1500,
        planned_duration_seconds: 1500
      })
      .select()
      .single()
    
    testResults.tests.study_sessions.details['can_create_own_session'] = {
      success: !createSessionError && newSession !== null,
      error: createSessionError?.message
    }

    if (newSession) {
      // 3.2 Can read own session
      const { data: readSession, error: readSessionError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('id', newSession.id)
        .single()
      
      testResults.tests.study_sessions.details['can_read_own_session'] = {
        success: !readSessionError && readSession !== null,
        error: readSessionError?.message
      }

      // 3.3 Can update own session
      const { error: updateSessionError } = await supabase
        .from('study_sessions')
        .update({ notes: 'RLS test update' })
        .eq('id', newSession.id)
      
      testResults.tests.study_sessions.details['can_update_own_session'] = {
        success: !updateSessionError,
        error: updateSessionError?.message
      }

      // 3.4 Can delete own session
      const { error: deleteSessionError } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', newSession.id)
      
      testResults.tests.study_sessions.details['can_delete_own_session'] = {
        success: !deleteSessionError,
        error: deleteSessionError?.message
      }
    }

    // Calculate overall pass/fail for each table
    for (const table of ['profiles', 'subjects', 'study_sessions'] as const) {
      const tests = Object.values(testResults.tests[table].details)
      testResults.tests[table].passed = tests.every(test => test.success)
    }

    // Overall result
    const allPassed = Object.values(testResults.tests).every(test => test.passed)

    return NextResponse.json({
      success: allPassed,
      results: testResults
    })

  } catch (error) {
    console.error('RLS test error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during RLS testing' 
    }, { status: 500 })
  }
}