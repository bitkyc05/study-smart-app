import { getServerClient } from '@/lib/supabase/server';
import { getUserTimezone } from '@/lib/user-timezone';
import { getCurrentDateInTimezone } from '@/lib/date-utils';
import CalendarView from './CalendarView';

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const supabase = await getServerClient();
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (!user || authError) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-gray-500">
          Please log in to view your study calendar.
        </div>
      </div>
    );
  }
  
  // Get user's timezone and current date
  const userTimezone = await getUserTimezone();
  const currentDate = getCurrentDateInTimezone(userTimezone);
  const year = parseInt(params.year || currentDate.getFullYear().toString());
  const month = parseInt(params.month || (currentDate.getMonth() + 1).toString());
  
  // Fetch calendar data using the existing RPC function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: calendarData, error } = await (supabase as any).rpc('get_monthly_calendar_data', {
    year: year,
    month: month,
    p_user_id: user.id,
    p_timezone: userTimezone
  });
  
  if (error) {
    console.error('Error fetching calendar data:', error);
  }
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <CalendarView 
        initialData={calendarData || []} 
        initialYear={year} 
        initialMonth={month} 
      />
    </div>
  );
}