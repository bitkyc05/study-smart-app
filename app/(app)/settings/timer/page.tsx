'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { usePomodoroStore } from '@/store/usePomodoroStore'

const DEFAULT_TIMER_OPTIONS = {
  study: [
    { value: 15 * 60, label: '15 minutes' },
    { value: 20 * 60, label: '20 minutes' },
    { value: 25 * 60, label: '25 minutes' },
    { value: 30 * 60, label: '30 minutes' },
    { value: 45 * 60, label: '45 minutes' },
    { value: 60 * 60, label: '1 hour' },
    { value: 90 * 60, label: '1.5 hours' },
    { value: 120 * 60, label: '2 hours' }
  ],
  break: [
    { value: 5 * 60, label: '5 minutes' },
    { value: 10 * 60, label: '10 minutes' },
    { value: 15 * 60, label: '15 minutes' },
    { value: 20 * 60, label: '20 minutes' },
    { value: 30 * 60, label: '30 minutes' },
    { value: 45 * 60, label: '45 minutes' },
    { value: 60 * 60, label: '1 hour' }
  ]
}

export default function TimerSettingsPage() {
  const router = useRouter()
  const { settings, actions } = usePomodoroStore()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [localSettings, setLocalSettings] = useState(settings)
  const [selectedStudyOptions, setSelectedStudyOptions] = useState<number[]>([])
  const [selectedBreakOptions, setSelectedBreakOptions] = useState<number[]>([])
  const [customStudyTime, setCustomStudyTime] = useState('')
  const [customBreakTime, setCustomBreakTime] = useState('')

  useEffect(() => {
    setLocalSettings(settings)
    // Initialize with default selected options
    const defaultStudy = [15 * 60, 20 * 60, 25 * 60, 30 * 60, 45 * 60]
    const defaultBreak = [5 * 60, 10 * 60, 15 * 60, 20 * 60]
    setSelectedStudyOptions(defaultStudy)
    setSelectedBreakOptions(defaultBreak)
  }, [settings])

  const updateSetting = (key: string, value: number | boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setHasUnsavedChanges(true)
  }

  const toggleStudyOption = (value: number) => {
    setSelectedStudyOptions(prev => {
      const newOptions = prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value].sort((a, b) => a - b)
      setHasUnsavedChanges(true)
      return newOptions
    })
  }

  const toggleBreakOption = (value: number) => {
    setSelectedBreakOptions(prev => {
      const newOptions = prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value].sort((a, b) => a - b)
      setHasUnsavedChanges(true)
      return newOptions
    })
  }

  const addCustomStudyTime = () => {
    const timeValue = Number(customStudyTime)
    const customValue = timeValue * 60
    if (timeValue >= 1 && timeValue <= 180 && !selectedStudyOptions.includes(customValue)) {
      setSelectedStudyOptions(prev => [...prev, customValue].sort((a, b) => a - b))
      setCustomStudyTime('')
      setHasUnsavedChanges(true)
    }
  }

  const addCustomBreakTime = () => {
    const timeValue = Number(customBreakTime)
    const customValue = timeValue * 60
    if (timeValue >= 1 && timeValue <= 180 && !selectedBreakOptions.includes(customValue)) {
      setSelectedBreakOptions(prev => [...prev, customValue].sort((a, b) => a - b))
      setCustomBreakTime('')
      setHasUnsavedChanges(true)
    }
  }

  const handleCustomStudyTimeChange = (value: string) => {
    const numValue = Number(value)
    if (value === '' || (numValue >= 0 && numValue <= 180)) {
      setCustomStudyTime(value)
    }
  }

  const handleCustomBreakTimeChange = (value: string) => {
    const numValue = Number(value)
    if (value === '' || (numValue >= 0 && numValue <= 180)) {
      setCustomBreakTime(value)
    }
  }

  const handleSave = () => {
    // Save the selected options and settings
    const updatedSettings = {
      ...localSettings,
      availableStudyDurations: selectedStudyOptions,
      availableBreakDurations: selectedBreakOptions
    }
    actions.updateSettings(updatedSettings)
    setHasUnsavedChanges(false)
    
    // Show success message
    alert('Timer settings saved successfully!')
  }

  const handleReset = () => {
    setLocalSettings(settings)
    const defaultStudy = [15 * 60, 20 * 60, 25 * 60, 30 * 60, 45 * 60]
    const defaultBreak = [5 * 60, 10 * 60, 15 * 60, 20 * 60]
    setSelectedStudyOptions(defaultStudy)
    setSelectedBreakOptions(defaultBreak)
    setCustomStudyTime('')
    setCustomBreakTime('')
    setHasUnsavedChanges(false)
  }

  const formatDuration = (seconds: number) => {
    const minutes = seconds / 60
    if (minutes >= 60) {
      const hours = minutes / 60
      return hours === Math.floor(hours) ? `${hours} hour${hours > 1 ? 's' : ''}` : `${hours} hours`
    }
    return `${minutes} minutes`
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
          <div>
            <h1 className="text-2xl font-medium text-text-primary">Timer Settings</h1>
            <p className="text-text-secondary mt-1">Configure your Pomodoro timer durations</p>
          </div>
          
          {hasUnsavedChanges && (
            <div className="flex gap-3">
              <button
                onClick={handleReset}
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
        {/* Study Duration Options */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Study Duration Options</h3>
            <p className="text-sm text-text-secondary">Select which study durations will be available in the timer</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {DEFAULT_TIMER_OPTIONS.study.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleStudyOption(option.value)}
                className={`p-3 text-sm rounded-lg border transition-all ${
                  selectedStudyOptions.includes(option.value)
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-white text-text-primary border-gray-200 hover:border-accent-primary hover:bg-accent-light'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          {/* Custom Study Time */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-text-primary mb-3">Add Custom Study Duration</h4>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="180"
                value={customStudyTime}
                onChange={(e) => handleCustomStudyTimeChange(e.target.value)}
                placeholder="25"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-accent-primary placeholder-gray-400"
              />
              <span className="text-sm text-text-secondary">minutes</span>
              <button
                onClick={addCustomStudyTime}
                disabled={!customStudyTime || Number(customStudyTime) < 1 || Number(customStudyTime) > 180 || selectedStudyOptions.includes(Number(customStudyTime) * 60)}
                className="px-3 py-2 text-xs bg-accent-primary text-white rounded hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-text-secondary mt-2">Range: 1-180 minutes</p>
          </div>

          {/* Selected Study Options Display */}
          {selectedStudyOptions.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-text-primary mb-2">Selected Study Durations</h4>
              <div className="flex flex-wrap gap-2">
                {selectedStudyOptions.map(duration => (
                  <span
                    key={duration}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-accent-light text-accent-primary text-xs rounded"
                  >
                    {formatDuration(duration)}
                    <button
                      onClick={() => toggleStudyOption(duration)}
                      className="ml-1 text-accent-primary hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Break Duration Options */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Break Duration Options</h3>
            <p className="text-sm text-text-secondary">Select which break durations will be available in the timer</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {DEFAULT_TIMER_OPTIONS.break.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleBreakOption(option.value)}
                className={`p-3 text-sm rounded-lg border transition-all ${
                  selectedBreakOptions.includes(option.value)
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-white text-text-primary border-gray-200 hover:border-accent-primary hover:bg-accent-light'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          {/* Custom Break Time */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-text-primary mb-3">Add Custom Break Duration</h4>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="180"
                value={customBreakTime}
                onChange={(e) => handleCustomBreakTimeChange(e.target.value)}
                placeholder="5"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-accent-primary placeholder-gray-400"
              />
              <span className="text-sm text-text-secondary">minutes</span>
              <button
                onClick={addCustomBreakTime}
                disabled={!customBreakTime || Number(customBreakTime) < 1 || Number(customBreakTime) > 180 || selectedBreakOptions.includes(Number(customBreakTime) * 60)}
                className="px-3 py-2 text-xs bg-accent-primary text-white rounded hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-text-secondary mt-2">Range: 1-180 minutes</p>
          </div>

          {/* Selected Break Options Display */}
          {selectedBreakOptions.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-text-primary mb-2">Selected Break Durations</h4>
              <div className="flex flex-wrap gap-2">
                {selectedBreakOptions.map(duration => (
                  <span
                    key={duration}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-accent-light text-accent-primary text-xs rounded"
                  >
                    {formatDuration(duration)}
                    <button
                      onClick={() => toggleBreakOption(duration)}
                      className="ml-1 text-accent-primary hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Current Timer Defaults */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Default Timer Settings</h3>
            <p className="text-sm text-text-secondary">Set the default durations when the timer starts</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Default Study Duration</label>
              <select
                value={localSettings.studyDuration}
                onChange={(e) => updateSetting('studyDuration', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
              >
                {selectedStudyOptions.map(duration => (
                  <option key={duration} value={duration}>
                    {formatDuration(duration)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Default Break Duration</label>
              <select
                value={localSettings.shortBreakDuration}
                onChange={(e) => updateSetting('shortBreakDuration', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
              >
                {selectedBreakOptions.map(duration => (
                  <option key={duration} value={duration}>
                    {formatDuration(duration)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Automation</h3>
            <p className="text-sm text-text-secondary">Automatically start timers when sessions complete or are stopped manually</p>
          </div>
          
          <div className="space-y-6">
            {/* Timer Completion Auto-Start */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">When Timer Completes</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.autoStartBreaks}
                    onChange={(e) => updateSetting('autoStartBreaks', e.target.checked)}
                    className="w-4 h-4 text-accent-primary border-gray-300 rounded focus:ring-accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-text-primary">Auto-start breaks</span>
                    <p className="text-xs text-text-secondary">Start break timer when study session completes</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.autoStartPomodoros}
                    onChange={(e) => updateSetting('autoStartPomodoros', e.target.checked)}
                    className="w-4 h-4 text-accent-primary border-gray-300 rounded focus:ring-accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-text-primary">Auto-start study sessions</span>
                    <p className="text-xs text-text-secondary">Start study session when break completes</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Manual Stop Auto-Start */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-text-primary mb-3">When Manually Stopped</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.autoStartBreakOnStudyStop || false}
                    onChange={(e) => updateSetting('autoStartBreakOnStudyStop', e.target.checked)}
                    className="w-4 h-4 text-accent-primary border-gray-300 rounded focus:ring-accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-text-primary">Start break when study stopped</span>
                    <p className="text-xs text-text-secondary">Automatically start break when you stop a study session early</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.autoStartStudyOnBreakStop || false}
                    onChange={(e) => updateSetting('autoStartStudyOnBreakStop', e.target.checked)}
                    className="w-4 h-4 text-accent-primary border-gray-300 rounded focus:ring-accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-text-primary">Start study when break stopped</span>
                    <p className="text-xs text-text-secondary">Automatically start study session when you stop a break early</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}