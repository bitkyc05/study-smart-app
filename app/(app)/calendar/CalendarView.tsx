'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MonthlyHeatmap } from '@/components/calendar/MonthlyHeatmap';
import { MonthSelector } from '@/components/calendar/MonthSelector';
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: calendarData, error } = await (supabase as any).rpc('get_monthly_calendar_data', {
        p_year: newYear,
        p_month: newMonth,
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
    // For now, just log the date. In Phase 4, this will open the SessionViewModal
    console.log('Date clicked:', date);
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

      {/* Placeholder for SessionViewModal - will be implemented in Phase 4 */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Session Details</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Selected date: {selectedDate}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              (Session view modal will be implemented in Phase 4)
            </p>
            <button
              onClick={() => setSelectedDate(null)}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}