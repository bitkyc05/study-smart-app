'use client';

import { useMemo } from 'react';
import { 
  getCalendarDays, 
  formatDateString, 
  isCurrentMonth, 
  formatDisplayDate,
  getWeekdayNames,
  isTodayString
} from '@/lib/date-utils';
import { 
  getColorClass, 
  getHoverColorClass, 
  formatMinutes,
  type HeatmapData 
} from '@/lib/calendar-utils';

interface MonthlyHeatmapProps {
  data: HeatmapData[];
  year: number;
  month: number;
  onDateClick: (date: string) => void;
}

export function MonthlyHeatmap({ data, year, month, onDateClick }: MonthlyHeatmapProps) {
  // Create a map for quick data lookup
  const dataMap = useMemo(() => {
    return new Map(data.map(item => [item.date, item]));
  }, [data]);

  // Get all days to display in the calendar grid
  const calendarDays = useMemo(() => {
    return getCalendarDays(year, month);
  }, [year, month]);

  // Get weekday names
  const weekdayNames = getWeekdayNames(true);

  return (
    <div className="w-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdayNames.map((day) => (
          <div 
            key={day} 
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date) => {
          const dateString = formatDateString(date);
          const dayData = dataMap.get(dateString);
          const isInMonth = isCurrentMonth(date, year, month);
          const isToday = isTodayString(dateString);
          const level = dayData?.level ?? 0;
          const colorClass = getColorClass(level);
          const hoverColorClass = getHoverColorClass(level);
          
          return (
            <button
              key={dateString}
              onClick={() => onDateClick(dateString)}
              disabled={!isInMonth}
              className={`
                relative aspect-square p-1 rounded-md transition-colors duration-200
                ${isInMonth ? 'cursor-pointer' : 'cursor-not-allowed opacity-30'}
                ${colorClass}
                ${isInMonth ? hoverColorClass : ''}
                ${isToday && isInMonth ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                group
              `}
              aria-label={`${formatDisplayDate(date)}: ${formatMinutes(dayData?.count ?? 0)}`}
            >
              {/* Date number */}
              <span className={`
                text-xs font-medium
                ${isInMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}
                ${level > 2 && isInMonth ? 'text-white' : ''}
              `}>
                {date.getDate()}
              </span>

              {/* Tooltip */}
              {isInMonth && dayData && (
                <div className="
                  absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                  bg-gray-900 text-white text-xs rounded-md py-1 px-2 
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  pointer-events-none whitespace-nowrap z-10
                ">
                  {formatMinutes(dayData.count)} on {formatDisplayDate(date)}
                  <div className="
                    absolute top-full left-1/2 transform -translate-x-1/2 -mt-1
                    w-0 h-0 border-l-4 border-r-4 border-t-4 
                    border-l-transparent border-r-transparent border-t-gray-900
                  "></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-end gap-2 text-xs text-gray-600 dark:text-gray-400">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`w-3 h-3 rounded-sm ${getColorClass(level as 0 | 1 | 2 | 3 | 4)}`}
              title={`Level ${level}`}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}