import { getServerClient } from '@/lib/supabase/server';
import CalendarView from './CalendarView';

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const currentDate = new Date();
  const year = parseInt(params.year || currentDate.getFullYear().toString());
  const month = parseInt(params.month || (currentDate.getMonth() + 1).toString());
  
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
  
  // Fetch calendar data using the existing RPC function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: calendarData, error } = await (supabase as any).rpc('get_monthly_calendar_data', {
    p_year: year,
    p_month: month,
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