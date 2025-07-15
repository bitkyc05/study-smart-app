/**
 * Study goal calculation utilities
 */

import { getTimezoneAwareDate } from '@/lib/date-utils';

/**
 * Calculate the number of weeks remaining until D-day
 * @param dDay - Target date
 * @returns Number of weeks remaining (minimum 0)
 */
export const calculateWeeksRemaining = (dDay: Date | string): number => {
  const targetDate = typeof dDay === 'string' ? new Date(dDay) : dDay;
  const today = getTimezoneAwareDate();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays / 7);
};

/**
 * Calculate weekly goal based on total goal and remaining weeks
 * @param totalGoalMinutes - Total goal in minutes
 * @param weeksRemaining - Number of weeks remaining
 * @returns Weekly goal in minutes
 */
export const calculateWeeklyGoal = (
  totalGoalMinutes: number,
  weeksRemaining: number
): number => {
  if (weeksRemaining <= 0) return 0;
  return Math.round(totalGoalMinutes / weeksRemaining);
};

/**
 * Convert proportion to minutes
 * @param proportion - Proportion value (0.0 - 1.0)
 * @param weeklyGoalMinutes - Weekly goal in minutes
 * @returns Minutes for the proportion
 */
export const proportionToMinutes = (
  proportion: number,
  weeklyGoalMinutes: number
): number => {
  return Math.round(proportion * weeklyGoalMinutes);
};

/**
 * Rebalance allocations to match target total
 * @param allocations - Current allocations (subject_id -> proportion)
 * @param targetTotal - Target total proportion (usually 1.0)
 * @returns Rebalanced allocations
 */
export const rebalanceAllocations = (
  allocations: Record<string, number>,
  targetTotal: number = 1.0
): Record<string, number> => {
  const currentTotal = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  
  if (currentTotal === 0) return allocations;
  
  // Proportional scaling
  const scaleFactor = targetTotal / currentTotal;
  const rebalanced: Record<string, number> = {};
  
  Object.entries(allocations).forEach(([key, value]) => {
    rebalanced[key] = value * scaleFactor;
  });
  
  return rebalanced;
};

/**
 * Format minutes to human-readable string
 * @param minutes - Total minutes
 * @returns Formatted string (e.g., "2h 30m", "45m")
 */
export const formatMinutes = (minutes: number): string => {
  if (minutes < 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
};

/**
 * Calculate days remaining until D-day
 * @param dDay - Target date
 * @returns Number of days remaining
 */
export const calculateDaysRemaining = (dDay: Date | string): number => {
  const targetDate = typeof dDay === 'string' ? new Date(dDay) : dDay;
  const today = getTimezoneAwareDate();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/**
 * Get urgency level based on days remaining
 * @param daysRemaining - Number of days remaining
 * @returns Urgency level: 'critical' | 'high' | 'medium' | 'low'
 */
export const getUrgencyLevel = (daysRemaining: number): 'critical' | 'high' | 'medium' | 'low' => {
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 30) return 'high';
  if (daysRemaining <= 90) return 'medium';
  return 'low';
};

/**
 * Get urgency color based on urgency level
 * @param urgency - Urgency level
 * @returns Tailwind color class
 */
export const getUrgencyColor = (urgency: 'critical' | 'high' | 'medium' | 'low'): string => {
  switch (urgency) {
    case 'critical':
      return 'text-red-500';
    case 'high':
      return 'text-orange-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-green-500';
  }
};

/**
 * Calculate progress percentage
 * @param current - Current value
 * @param total - Total value
 * @returns Progress percentage (0-100)
 */
export const calculateProgress = (current: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
};