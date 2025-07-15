'use client'

import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { DdaySectionProps } from '@/types/settings'
import { calculateDaysRemaining, getUrgencyLevel, getUrgencyColor } from '@/lib/settings/calculations'

export default function DdaySection({ 
  value, 
  title, 
  onDdayChange, 
  remainingWeeks 
}: DdaySectionProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTitle, setSelectedTitle] = useState(title || '')
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low')

  useEffect(() => {
    if (value) {
      // Convert ISO string to date input value (YYYY-MM-DD)
      const date = new Date(value)
      const formattedDate = date.toISOString().split('T')[0]
      setSelectedDate(formattedDate)
      
      const days = calculateDaysRemaining(date)
      setDaysRemaining(days)
      setUrgencyLevel(getUrgencyLevel(days))
    }
  }, [value])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setSelectedDate(newDate)
    
    if (newDate) {
      const date = new Date(newDate)
      const days = calculateDaysRemaining(date)
      setDaysRemaining(days)
      setUrgencyLevel(getUrgencyLevel(days))
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTitle(e.target.value)
  }

  const handleApply = () => {
    if (selectedDate) {
      const date = new Date(selectedDate)
      onDdayChange(date, selectedTitle)
    }
  }

  const urgencyColorClass = getUrgencyColor(urgencyLevel)

  return (
    <div className="bg-white rounded-lg p-6 border border-accent">
      <div className="flex items-center gap-3 mb-4">
        <CalendarDaysIcon className="h-6 w-6 text-accent-primary" />
        <h3 className="text-lg font-medium text-text-primary">D-Day Setting</h3>
      </div>

      <div className="space-y-4">
        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Goal Title
          </label>
          <input
            type="text"
            value={selectedTitle}
            onChange={handleTitleChange}
            placeholder="e.g., Final Exam, TOEIC Test"
            className="w-full px-3 py-2 border border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
          />
        </div>

        {/* Date Input */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Target Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
          />
        </div>

        {/* Remaining Time Display */}
        {daysRemaining !== null && selectedDate && (
          <div className={`p-4 rounded-lg ${urgencyColorClass} bg-opacity-10`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-text-secondary">Days Remaining</p>
                <p className={`text-2xl font-bold ${urgencyColorClass}`}>
                  {daysRemaining} days
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-secondary">Weeks Remaining</p>
                <p className={`text-2xl font-bold ${urgencyColorClass}`}>
                  {remainingWeeks.toFixed(1)} weeks
                </p>
              </div>
            </div>
            
            {/* Urgency Indicator */}
            <div className="mt-3 pt-3 border-t border-accent">
              <p className="text-sm">
                <span className="text-text-secondary">Urgency Level: </span>
                <span className={`font-medium ${urgencyColorClass}`}>
                  {urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Apply Button */}
        {selectedDate && selectedTitle && (
          <button
            onClick={handleApply}
            className="w-full py-2 px-4 bg-accent-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Set D-Day
          </button>
        )}

        {/* Warning Message */}
        {value && selectedDate && value !== selectedDate && (
          <div className="p-3 bg-color-warning bg-opacity-10 rounded-lg">
            <p className="text-sm text-color-warning">
              ⚠️ Changing D-Day will reset your accumulated study time. 
              You&apos;ll be asked to confirm this change.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}