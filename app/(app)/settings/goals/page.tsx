'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useGoalSettingsStore } from '@/store/useGoalSettingsStore'
import { calculateWeeksRemaining } from '@/lib/settings/calculations'
import DdaySection from '@/components/settings/goals/DdaySection'
import TotalGoalSection from '@/components/settings/goals/TotalGoalSection'
import WeeklyGoalSection from '@/components/settings/goals/WeeklyGoalSection'
import SubjectAllocationSection from '@/components/settings/goals/SubjectAllocationSection'
import DdayChangeModal from '@/components/settings/goals/DdayChangeModal'

export default function GoalsSettingsPage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<Array<{
    id: number
    name: string
    color_hex: string
  }>>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const {
    settings,
    isLoading,
    hasUnsavedChanges,
    tempDday,
    loadSettings,
    updateDday,
    confirmDdayChange,
    updateTotalGoal,
    updateSubjectAllocation,
    saveSettings,
    resetChanges,
    setTempDday
  } = useGoalSettingsStore()

  // Load settings and subjects on mount
  useEffect(() => {
    loadSettings()
    fetchSubjects()
  }, [loadSettings])

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects')
      if (response.ok) {
        const data = await response.json()
        setSubjects(data)
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error)
    }
  }

  const handleDdayChange = (date: Date, title: string) => {
    if (settings?.d_day) {
      // If D-day already exists, show confirmation modal
      updateDday(date, title) // This will set tempDday and tempDdayTitle
      setIsModalOpen(true)
    } else {
      // First time setting D-day
      updateDday(date, title)
    }
  }

  const handleConfirmDdayChange = () => {
    if (tempDday) {
      confirmDdayChange()
      setIsModalOpen(false)
    }
  }

  const handleCancelDdayChange = () => {
    setTempDday(null)
    setIsModalOpen(false)
  }

  const handleSave = async () => {
    await saveSettings()
    // Show success message (you could add a toast notification here)
  }

  const handleRebalance = useCallback(() => {
    if (!settings || subjects.length === 0) return
    
    // Initialize allocations for all subjects with equal proportions
    const equalProportion = 1 / subjects.length
    
    subjects.forEach(subject => {
      updateSubjectAllocation(subject.id.toString(), equalProportion)
    })
  }, [settings, subjects, updateSubjectAllocation])

  const remainingWeeks = settings?.d_day 
    ? calculateWeeksRemaining(new Date(settings.d_day))
    : 0

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-accent-light rounded w-1/3"></div>
          <div className="h-64 bg-accent-light rounded"></div>
          <div className="h-64 bg-accent-light rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/settings')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span className="text-sm">Back to Settings</span>
        </button>
        
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-medium text-text-primary">Study Goals</h1>
          
          {hasUnsavedChanges && (
            <div className="flex gap-3">
              <button
                onClick={resetChanges}
                className="px-4 py-2 text-sm border border-accent rounded-lg hover:bg-accent-light transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-accent-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* D-Day Section */}
        <DdaySection
          value={settings?.d_day || null}
          title={settings?.d_day_title || ''}
          onDdayChange={handleDdayChange}
          remainingWeeks={remainingWeeks}
        />

        {/* Total Goal Section */}
        <TotalGoalSection
          value={settings?.total_goal_minutes || 0}
          onTotalGoalChange={updateTotalGoal}
          dDay={settings?.d_day || null}
        />

        {/* Weekly Goal Section */}
        {settings?.d_day && settings?.total_goal_minutes > 0 && (
          <WeeklyGoalSection
            weeklyGoal={settings.weekly_goal_minutes}
            isAutoCalculated={true}
            tooltip="This is calculated by dividing your total goal by the remaining weeks until D-Day"
          />
        )}

        {/* Subject Allocation Section */}
        {settings?.d_day && settings?.weekly_goal_minutes > 0 && subjects.length > 0 && (
          <SubjectAllocationSection
            subjects={subjects}
            allocations={settings.subject_allocations || {}}
            weeklyGoal={settings.weekly_goal_minutes}
            onAllocationChange={updateSubjectAllocation}
            onRebalance={handleRebalance}
          />
        )}
      </div>

      {/* D-Day Change Modal */}
      <DdayChangeModal
        isOpen={isModalOpen}
        onConfirm={handleConfirmDdayChange}
        onCancel={handleCancelDdayChange}
        currentDday={settings?.d_day || null}
        newDday={tempDday || new Date()}
      />
    </div>
  )
}