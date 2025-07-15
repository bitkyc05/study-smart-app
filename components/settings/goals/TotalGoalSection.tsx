'use client'

import { ClockIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { TotalGoalSectionProps } from '@/types/settings'
import { formatMinutes } from '@/lib/settings/calculations'

export default function TotalGoalSection({ 
  value, 
  onTotalGoalChange,
  dDay 
}: TotalGoalSectionProps) {
  const [hours, setHours] = useState(0)
  const [displayValue, setDisplayValue] = useState('')

  useEffect(() => {
    // Convert minutes to hours for display
    const totalHours = Math.floor(value / 60)
    setHours(totalHours)
    setDisplayValue(formatMinutes(value))
  }, [value])

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = parseInt(e.target.value) || 0
    setHours(newHours)
    
    // Convert hours to minutes and update
    const newMinutes = newHours * 60
    onTotalGoalChange(newMinutes)
  }

  const handlePresetClick = (presetHours: number) => {
    setHours(presetHours)
    onTotalGoalChange(presetHours * 60)
  }

  const isDisabled = !dDay

  return (
    <div className="bg-white rounded-lg p-6 border border-accent">
      <div className="flex items-center gap-3 mb-4">
        <ClockIcon className="h-6 w-6 text-accent-primary" />
        <h3 className="text-lg font-medium text-text-primary">Total Study Goal</h3>
      </div>

      <div className="space-y-4">
        {/* Hours Input */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Target Study Hours
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={hours}
              onChange={handleHoursChange}
              min="0"
              max="10000"
              disabled={isDisabled}
              className="w-32 px-3 py-2 border border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <span className="text-text-secondary">hours</span>
          </div>
          
          {/* Display formatted time */}
          {value > 0 && (
            <p className="mt-2 text-sm text-text-secondary">
              = {displayValue}
            </p>
          )}
        </div>

        {/* Preset Buttons */}
        <div>
          <p className="text-sm text-text-secondary mb-2">Quick Selection</p>
          <div className="grid grid-cols-4 gap-2">
            {[100, 200, 300, 500].map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                disabled={isDisabled}
                className="py-2 px-3 text-sm border border-accent rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {preset}h
              </button>
            ))}
          </div>
        </div>

        {/* Recommendation */}
        {dDay && value > 0 && (
          <div className="p-3 bg-accent-light rounded-lg">
            <p className="text-sm text-text-secondary">
              💡 <span className="font-medium">Tip:</span> Setting realistic goals increases your chance of success. 
              Consider your daily schedule and other commitments when setting your total goal.
            </p>
          </div>
        )}

        {/* Warning if no D-Day */}
        {!dDay && (
          <div className="p-3 bg-color-warning bg-opacity-10 rounded-lg">
            <p className="text-sm text-color-warning">
              ⚠️ Please set a D-Day first to enable goal setting.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}