/**
 * Study goal settings type definitions
 */

export interface SubjectAllocation {
  proportion: number; // 0.0 ~ 1.0 (e.g., 0.3 = 30%)
  subject_name: string;
  color_hex: string;
}

export interface StudyGoalSettings {
  id?: string;
  user_id?: string;
  
  // D-day information
  d_day: string | null; // ISO date string
  d_day_title: string;
  d_day_created_at: string | null; // ISO date string - D-day setting date (baseline)
  
  // Goal time
  total_goal_minutes: number;
  weekly_goal_minutes: number; // Auto-calculated but cached for performance
  
  // Subject allocations (proportion-based storage)
  subject_allocations: Record<string, SubjectAllocation>;
  
  // Settings
  include_etc_subject: boolean; // Include "Other" subject
  auto_rebalance: boolean; // Auto-rebalance enabled
  
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  study_goals: StudyGoalSettings;
  preferences: Record<string, any>;
  notifications: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Props types for components
export interface DdaySectionProps {
  value: string | null;
  title: string;
  onDdayChange: (date: Date, title: string) => void;
  remainingWeeks: number;
}

export interface TotalGoalSectionProps {
  value: number;
  onTotalGoalChange: (minutes: number) => void;
  dDay: string | null;
}

export interface WeeklyGoalSectionProps {
  weeklyGoal: number;
  isAutoCalculated: boolean;
  tooltip?: string;
}

export interface SubjectAllocationSectionProps {
  subjects: Array<{
    id: number;
    name: string;
    color_hex: string;
  }>;
  allocations: Record<string, SubjectAllocation>;
  weeklyGoal: number;
  onAllocationChange: (subjectId: string, proportion: number) => void;
  onRebalance: () => void;
}

export interface DdayChangeModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  currentDday: string | null;
  newDday: Date;
}