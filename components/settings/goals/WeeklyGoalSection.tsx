'use client'

import { CalendarIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { WeeklyGoalSectionProps } from '@/types/settings'
import { formatMinutes } from '@/lib/settings/calculations'

export default function WeeklyGoalSection({ 
  weeklyGoal, 
  isAutoCalculated,
  tooltip 
}: WeeklyGoalSectionProps) {
  const dailyAverage = weeklyGoal / 7
  const formattedWeekly = formatMinutes(weeklyGoal)
  const formattedDaily = formatMinutes(Math.round(dailyAverage))

  return (
    <div className="bg-white rounded-lg p-6 border border-accent">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-accent-primary" />
          <h3 className="text-lg font-medium text-text-primary">Weekly Study Goal</h3>
        </div>
        
        {/* Info Tooltip */}
        {tooltip && (
          <div className="group relative">
            <InformationCircleIcon className="h-5 w-5 text-text-secondary cursor-help" />
            <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {tooltip}
              <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Weekly Goal Display */}
        <div className="bg-accent-light rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-text-secondary mb-1">Weekly Target</p>
              <p className="text-3xl font-bold text-accent-primary">
                {formattedWeekly}
              </p>
            </div>
            
            {isAutoCalculated && (
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-accent-primary text-white rounded-full">
                  Auto-calculated
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Daily Average */}
        <div className="border-t border-accent pt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-text-secondary">Daily Average</p>
            <p className="text-lg font-medium text-text-primary">
              {formattedDaily}
            </p>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">Weekly Progress Visualization</p>
          <div className="grid grid-cols-7 gap-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="text-center">
                <p className="text-xs text-text-secondary mb-1">{day}</p>
                <div className="h-20 bg-accent-light rounded flex items-end p-1">
                  <div 
                    className="w-full bg-accent-primary rounded transition-all"
                    style={{ height: '50%' }} // This would be dynamic based on actual progress
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculation Info */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            📊 This goal is automatically calculated based on your total goal and remaining time until D-Day. 
            It updates whenever you change your total goal or D-Day.
          </p>
        </div>
      </div>
    </div>
  )
}