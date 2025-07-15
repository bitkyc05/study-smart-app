'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getMonthName, getNextMonth, getPreviousMonth, getCurrentYearMonth } from '@/lib/date-utils';

interface MonthSelectorProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}

export function MonthSelector({ year, month, onMonthChange }: MonthSelectorProps) {
  const handlePreviousMonth = () => {
    const { year: prevYear, month: prevMonth } = getPreviousMonth(year, month);
    onMonthChange(prevYear, prevMonth);
  };

  const handleNextMonth = () => {
    const { year: nextYear, month: nextMonth } = getNextMonth(year, month);
    onMonthChange(nextYear, nextMonth);
  };

  const handleCurrentMonth = () => {
    const { year: currentYear, month: currentMonth } = getCurrentYearMonth();
    onMonthChange(currentYear, currentMonth);
  };

  const isCurrentMonth = () => {
    const { year: currentYear, month: currentMonth } = getCurrentYearMonth();
    return year === currentYear && month === currentMonth;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Previous month button */}
      <button
        onClick={handlePreviousMonth}
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>

      {/* Month and year display */}
      <div className="flex items-center gap-3 min-w-[200px] justify-center">
        <h2 className="text-lg font-semibold">
          {getMonthName(month)} {year}
        </h2>
      </div>

      {/* Next month button */}
      <button
        onClick={handleNextMonth}
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Next month"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>

      {/* Today button */}
      {!isCurrentMonth() && (
        <button
          onClick={handleCurrentMonth}
          className="
            ml-2 px-3 py-1 text-sm font-medium
            bg-blue-500 text-white rounded-md
            hover:bg-blue-600 transition-colors
          "
        >
          Today
        </button>
      )}
    </div>
  );
}