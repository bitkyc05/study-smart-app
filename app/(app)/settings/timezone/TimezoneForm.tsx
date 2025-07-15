'use client'

import { useEffect, useState } from 'react'
import { TIMEZONE_OPTIONS } from '@/lib/timezone-options'
import { updateUserTimezone } from './actions'
import { Globe, Clock, Check, AlertCircle } from 'lucide-react'

interface TimezoneFormProps {
  userTimezone: string | null
}

export default function TimezoneForm({ userTimezone }: TimezoneFormProps) {
  const [selectedTimezone, setSelectedTimezone] = useState(userTimezone || '')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    // If timezone is not set in DB, detect from browser and save it
    if (!userTimezone) {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (browserTimezone) {
        setSelectedTimezone(browserTimezone)
        // Auto-save the detected timezone
        updateUserTimezone(browserTimezone).catch(console.error)
      }
    }
  }, [userTimezone])

  const handleSave = async (timezone?: string) => {
    const timezoneToSave = timezone || selectedTimezone
    if (!timezoneToSave) return

    setIsLoading(true)
    setMessage(null)

    try {
      await updateUserTimezone(timezoneToSave)
      setMessage({ type: 'success', text: 'Timezone updated successfully!' })
      
      // Refresh the page to apply changes
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Error updating timezone:', error)
      setMessage({ type: 'error', text: 'Failed to update timezone. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentTime = () => {
    if (!selectedTimezone) return ''
    
    try {
      return new Date().toLocaleString(undefined, {
        timeZone: selectedTimezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return 'Invalid timezone'
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Timezone Display */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-6 h-6 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">Current Timezone</h2>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Selected Timezone:</span>
            <span className="font-medium text-gray-900">
              {selectedTimezone || 'Not set'}
            </span>
          </div>
          
          {selectedTimezone && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">
                Current time: {getCurrentTime()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timezone Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Timezone</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose your timezone
            </label>
            <select
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading}
            >
              <option value="">Select a timezone...</option>
              {TIMEZONE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-detect button */}
          <button
            onClick={() => {
              const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
              if (browserTimezone) {
                setSelectedTimezone(browserTimezone)
              }
            }}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            disabled={isLoading}
          >
            Auto-detect from browser
          </button>

          {/* Save button */}
          <button
            onClick={() => handleSave()}
            disabled={isLoading || !selectedTimezone || selectedTimezone === userTimezone}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Timezone
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">About Timezone Settings</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Your timezone affects how dates and times are displayed throughout the app</li>
              <li>Study sessions, calendar events, and statistics will be shown in your selected timezone</li>
              <li>You can change this setting anytime if you travel or move to a different timezone</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}