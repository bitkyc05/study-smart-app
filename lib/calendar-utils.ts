export interface HeatmapData {
  date: string; // 'YYYY-MM-DD'
  count: number; // Total study minutes
  level: 0 | 1 | 2 | 3 | 4; // Activity level
}

export interface CalendarData {
  date: string;
  total_minutes: number;
  sessions_count?: number;
  subjects?: string[];
}

/**
 * Transform raw calendar data from database to heatmap format
 */
export function transformToHeatmapData(rawData: CalendarData[]): HeatmapData[] {
  return rawData.map(item => ({
    date: item.date,
    count: item.total_minutes,
    level: calculateLevel(item.total_minutes),
  }));
}

/**
 * Calculate activity level based on minutes studied
 * 0: No activity
 * 1: Low activity (1-30 minutes)
 * 2: Medium activity (31-60 minutes)
 * 3: High activity (61-120 minutes)
 * 4: Very high activity (>120 minutes)
 */
export function calculateLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes === 0) return 0;
  if (minutes <= 30) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 120) return 3;
  return 4;
}

/**
 * Get color class for activity level (GitHub style)
 */
export function getColorClass(level: 0 | 1 | 2 | 3 | 4): string {
  const colorMap = {
    0: 'bg-gray-100 dark:bg-gray-800', // No activity
    1: 'bg-green-200 dark:bg-green-900', // Low activity
    2: 'bg-green-300 dark:bg-green-700', // Medium activity
    3: 'bg-green-400 dark:bg-green-600', // High activity
    4: 'bg-green-500 dark:bg-green-500', // Very high activity
  };
  return colorMap[level];
}

/**
 * Get hover color class for activity level
 */
export function getHoverColorClass(level: 0 | 1 | 2 | 3 | 4): string {
  const hoverMap = {
    0: 'hover:bg-gray-200 dark:hover:bg-gray-700',
    1: 'hover:bg-green-300 dark:hover:bg-green-800',
    2: 'hover:bg-green-400 dark:hover:bg-green-600',
    3: 'hover:bg-green-500 dark:hover:bg-green-500',
    4: 'hover:bg-green-600 dark:hover:bg-green-400',
  };
  return hoverMap[level];
}

/**
 * Format minutes to human-readable string
 */
export function formatMinutes(minutes: number): string {
  if (minutes === 0) return 'No study';
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

