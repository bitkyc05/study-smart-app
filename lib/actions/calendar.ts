'use server';

import { getServerClient } from '@/lib/supabase/server';
import { getUserTimezone } from '@/lib/user-timezone';
import { userTimezoneToUtc } from '@/lib/date-utils';

export interface StudySession {
  id: number;
  user_id: string;
  subject_id: number | null;
  duration_seconds: number;
  created_at: string | null;
  end_time: string;
  subjects: {
    name: string;
    color_hex: string;
  } | null;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function getSessionsByDate(date: string) {
  try {
    const supabase = await getServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error('Authentication failed');
    }
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    // 날짜 범위 설정 (해당 날짜의 시작과 끝) - timezone-aware
    const userTimezone = await getUserTimezone();
    const targetDate = new Date(date);
    
    // Set time boundaries in user's timezone
    const startDateInUserTz = new Date(targetDate);
    startDateInUserTz.setHours(0, 0, 0, 0);
    const endDateInUserTz = new Date(targetDate);
    endDateInUserTz.setHours(23, 59, 59, 999);
    
    // Convert to UTC for database queries
    const startDate = userTimezoneToUtc(startDateInUserTz, userTimezone);
    const endDate = userTimezoneToUtc(endDateInUserTz, userTimezone);

    console.log('Fetching sessions for date:', date, 'User:', user.id);
    console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());

    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select(`
        *,
        subjects (
          name,
          color_hex
        )
      `)
      .eq('user_id', user.id)
      .eq('session_type', 'study') // Filter for study sessions only
      .gte('end_time', startDate.toISOString())
      .lte('end_time', endDate.toISOString())
      .order('end_time', { ascending: false });

    if (error) {
      console.error('Database error fetching sessions:', error);
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    console.log('Sessions fetched:', sessions?.length || 0);
    return (sessions || []) as StudySession[];
  } catch (error) {
    console.error('Error in getSessionsByDate:', error);
    throw error;
  }
}

export async function getJournalByDate(date: string) {
  const supabase = await getServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: journal, error } = await (supabase as any)
    .from('journals')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching journal:', error);
    throw new Error('Failed to fetch journal');
  }

  return journal as JournalEntry | null;
}

export async function createOrUpdateJournal(date: string, content: string) {
  const supabase = await getServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('journals')
    .upsert({
      user_id: user.id,
      date,
      content,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,date',
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving journal:', error);
    throw new Error('Failed to save journal');
  }

  return data as JournalEntry;
}

export async function deleteJournal(date: string) {
  const supabase = await getServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('journals')
    .delete()
    .eq('user_id', user.id)
    .eq('date', date);

  if (error) {
    console.error('Error deleting journal:', error);
    throw new Error('Failed to delete journal');
  }

  return { success: true };
}