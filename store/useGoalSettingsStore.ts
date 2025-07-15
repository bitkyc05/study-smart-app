import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { StudyGoalSettings } from '@/types/settings';
import { calculateWeeksRemaining, calculateWeeklyGoal } from '@/lib/settings/calculations';

interface GoalSettingsStore {
  // State
  settings: StudyGoalSettings | null;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  tempDday: Date | null; // Temporary storage for D-day change
  tempDdayTitle: string; // Temporary storage for D-day title
  
  // Actions
  loadSettings: () => Promise<void>;
  updateDday: (date: Date, title: string) => void;
  confirmDdayChange: () => void;
  updateTotalGoal: (minutes: number) => void;
  updateSubjectAllocation: (subjectId: string, proportion: number) => void;
  rebalanceAllocations: () => void;
  saveSettings: () => Promise<void>;
  resetChanges: () => void;
  setTempDday: (date: Date | null) => void;
}

export const useGoalSettingsStore = create<GoalSettingsStore>()(
  devtools(
    (set, get) => ({
      settings: null,
      isLoading: false,
      hasUnsavedChanges: false,
      tempDday: null,
      tempDdayTitle: '',
      
      loadSettings: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/settings/goals');
          if (response.ok) {
            const data = await response.json();
            set({ settings: data, isLoading: false });
          } else {
            // Initialize with default settings if none exist
            set({
              settings: {
                d_day: null,
                d_day_title: '',
                d_day_created_at: null,
                total_goal_minutes: 0,
                weekly_goal_minutes: 0,
                subject_allocations: {},
                include_etc_subject: true,
                auto_rebalance: true
              },
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Failed to load settings:', error);
          set({ isLoading: false });
        }
      },
      
      updateDday: (date: Date, title: string) => {
        const { settings } = get();
        if (!settings) return;
        
        // If no existing D-day, set it directly
        if (!settings.d_day) {
          const dateString = date.toISOString();
          const weeksRemaining = calculateWeeksRemaining(date);
          const weeklyGoal = calculateWeeklyGoal(settings.total_goal_minutes, weeksRemaining);
          
          set({
            settings: {
              ...settings,
              d_day: dateString,
              d_day_title: title,
              d_day_created_at: new Date().toISOString(),
              weekly_goal_minutes: weeklyGoal
            },
            hasUnsavedChanges: true
          });
        } else {
          // Store temporarily for confirmation modal
          set({ tempDday: date, tempDdayTitle: title });
        }
      },
      
      confirmDdayChange: () => {
        const { tempDday, tempDdayTitle, settings } = get();
        if (!tempDday || !settings) return;
        
        const dateString = tempDday.toISOString();
        const weeksRemaining = calculateWeeksRemaining(tempDday);
        const weeklyGoal = calculateWeeklyGoal(settings.total_goal_minutes, weeksRemaining);
        
        set({
          settings: {
            ...settings,
            d_day: dateString,
            d_day_title: tempDdayTitle,
            d_day_created_at: new Date().toISOString(),
            weekly_goal_minutes: weeklyGoal
          },
          tempDday: null,
          tempDdayTitle: '',
          hasUnsavedChanges: true
        });
      },
      
      updateTotalGoal: (minutes: number) => {
        set((state) => {
          if (!state.settings) return state;
          
          const dDay = state.settings.d_day ? new Date(state.settings.d_day) : null;
          const weeksRemaining = dDay ? calculateWeeksRemaining(dDay) : 0;
          const weeklyGoal = calculateWeeklyGoal(minutes, weeksRemaining);
          
          return {
            settings: {
              ...state.settings,
              total_goal_minutes: minutes,
              weekly_goal_minutes: weeklyGoal
            },
            hasUnsavedChanges: true
          };
        });
      },
      
      updateSubjectAllocation: (subjectId: string, proportion: number) => {
        set((state) => {
          if (!state.settings) return state;
          
          const newAllocations = {
            ...state.settings.subject_allocations,
            [subjectId]: {
              ...state.settings.subject_allocations[subjectId],
              proportion: Math.min(1, Math.max(0, proportion))
            }
          };
          
          // Calculate total proportion
          const totalProportion = Object.values(newAllocations)
            .reduce((sum, alloc) => sum + alloc.proportion, 0);
          
          // If total exceeds 1, scale down other subjects proportionally
          if (totalProportion > 1) {
            const scaleFactor = (1 - proportion) / (totalProportion - proportion);
            Object.keys(newAllocations).forEach((id) => {
              if (id !== subjectId) {
                newAllocations[id].proportion *= scaleFactor;
              }
            });
          }
          
          return {
            settings: {
              ...state.settings,
              subject_allocations: newAllocations
            },
            hasUnsavedChanges: true
          };
        });
      },
      
      rebalanceAllocations: () => {
        set((state) => {
          if (!state.settings) return state;
          
          // Note: This function should be called from the component level
          // after subjects are loaded, so it can properly initialize allocations
          // for all subjects, not just the ones already in allocations
          
          const subjectCount = Object.keys(state.settings.subject_allocations).length;
          if (subjectCount === 0) return state;
          
          const equalProportion = 1 / subjectCount;
          const newAllocations: typeof state.settings.subject_allocations = {};
          
          Object.entries(state.settings.subject_allocations).forEach(([id, alloc]) => {
            newAllocations[id] = {
              ...alloc,
              proportion: equalProportion
            };
          });
          
          return {
            settings: {
              ...state.settings,
              subject_allocations: newAllocations
            },
            hasUnsavedChanges: true
          };
        });
      },
      
      saveSettings: async () => {
        const { settings } = get();
        if (!settings) return;
        
        set({ isLoading: true });
        try {
          const response = await fetch('/api/settings/goals', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
          });
          
          if (response.ok) {
            const updatedSettings = await response.json();
            set({ 
              settings: updatedSettings,
              hasUnsavedChanges: false, 
              tempDday: null 
            });
          } else {
            throw new Error('Failed to save settings');
          }
        } catch (error) {
          console.error('Failed to save settings:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      resetChanges: () => {
        set({ hasUnsavedChanges: false, tempDday: null });
        get().loadSettings();
      },
      
      setTempDday: (date: Date | null) => {
        set({ tempDday: date, tempDdayTitle: '' });
      }
    }),
    { name: 'goal-settings' }
  )
);