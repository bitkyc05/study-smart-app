import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns';

/**
 * Get all days to display in a calendar grid for a given month
 * Includes days from previous/next month to fill the grid
 */
export function getCalendarDays(year: number, month: number) {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  return eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });
}

/**
 * Get the days of a specific month only
 */
export function getMonthDays(year: number, month: number) {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  
  return eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });
}

/**
 * Check if a date belongs to the current month
 */
export function isCurrentMonth(date: Date, year: number, month: number): boolean {
  const targetMonth = new Date(year, month - 1);
  return isSameMonth(date, targetMonth);
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format date for display
 */
export function formatDisplayDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMMM d, yyyy');
}

/**
 * Get short weekday names
 */
export function getWeekdayNames(short: boolean = true): string[] {
  if (short) {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
}

/**
 * Check if two dates are the same day
 */
export function isSameDayString(date1: string, date2: string): boolean {
  return isSameDay(parseISO(date1), parseISO(date2));
}

/**
 * Check if a date string represents today
 */
export function isTodayString(dateString: string): boolean {
  return isToday(parseISO(dateString));
}

/**
 * Get next month's year and month
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } {
  const date = new Date(year, month - 1);
  const nextMonth = addMonths(date, 1);
  return {
    year: nextMonth.getFullYear(),
    month: nextMonth.getMonth() + 1,
  };
}

/**
 * Get previous month's year and month
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  const date = new Date(year, month - 1);
  const prevMonth = subMonths(date, 1);
  return {
    year: prevMonth.getFullYear(),
    month: prevMonth.getMonth() + 1,
  };
}

/**
 * Get current year and month
 * Note: This should only be used in client-side components to avoid SSR timezone issues
 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

/**
 * Get week number in month for a date
 */
export function getWeekOfMonth(date: Date): number {
  const monthStart = startOfMonth(date);
  const weekStart = startOfWeek(monthStart);
  const weeksDiff = Math.floor((date.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return weeksDiff + 1;
}

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}