'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MonthlyHeatmap } from '@/components/calendar/MonthlyHeatmap';
import { MonthSelector } from '@/components/calendar/MonthSelector';
import { SessionViewModal } from '@/components/calendar/SessionViewModal';
import { transformToHeatmapData, type CalendarData } from '@/lib/calendar-utils';
import { createClient } from '@/lib/supabase/client';

interface CalendarViewProps {
  initialData: CalendarData[];
  initialYear: number;
  initialMonth: number;
}

export default function CalendarView({ 
  initialData, 
  initialYear, 
  initialMonth 
}: CalendarViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Transform data for heatmap
  const heatmapData = transformToHeatmapData(data);

  // Handle month change
  const handleMonthChange = useCallback(async (newYear: number, newMonth: number) => {
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', newYear.toString());
    params.set('month', newMonth.toString());
    router.push(`/calendar?${params.toString()}`);

    // Update state
    setYear(newYear);
    setMonth(newMonth);
    setIsLoading(true);

    try {
      // Fetch new data
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User not authenticated');
        setIsLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: calendarData, error } = await (supabase as any).rpc('get_monthly_calendar_data', {
        year: newYear,
        month: newMonth,
        p_user_id: user.id,
      });

      if (error) throw error;

      setData(calendarData || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router, searchParams]);

  // Handle date click
  const handleDateClick = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Study Calendar</h1>
        <MonthSelector 
          year={year} 
          month={month} 
          onMonthChange={handleMonthChange} 
        />
      </div>

      {/* Calendar Heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500">Loading calendar data...</div>
          </div>
        ) : (
          <MonthlyHeatmap 
            data={heatmapData} 
            year={year} 
            month={month} 
            onDateClick={handleDateClick} 
          />
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Study Days</h3>
          <p className="text-2xl font-bold mt-1">
            {data.filter(d => d.total_minutes > 0).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Study Time</h3>
          <p className="text-2xl font-bold mt-1">
            {Math.floor(data.reduce((sum, d) => sum + d.total_minutes, 0) / 60)}h
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Daily</h3>
          <p className="text-2xl font-bold mt-1">
            {data.length > 0 
              ? Math.floor(data.reduce((sum, d) => sum + d.total_minutes, 0) / data.length)
              : 0}m
          </p>
        </div>
      </div>

      {/* Session View Modal */}
      <SessionViewModal
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        date={selectedDate || ''}
      />
    </div>
  );
}