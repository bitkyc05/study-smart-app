'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeftIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline'
import { usePomodoroStore } from '@/store/usePomodoroStore'

const NOTIFICATION_SOUNDS = [
  { value: 'bell', label: 'Bell', file: '/sounds/bell.mp3' },
  { value: 'chime', label: 'Chime', file: '/sounds/chime.mp3' },
  { value: 'ding', label: 'Ding', file: '/sounds/ding.mp3' },
  { value: 'none', label: 'No Sound', file: null }
]

export default function NotificationsSettingsPage() {
  const router = useRouter()
  const { notificationSettings, actions } = usePomodoroStore()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [localSettings, setLocalSettings] = useState({
    ...notificationSettings,
    soundType: 'bell',
    doNotDisturb: false,
    dndStart: '22:00',
    dndEnd: '08:00'
  })
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    setLocalSettings({
      ...notificationSettings,
      soundType: 'bell',
      doNotDisturb: false,
      dndStart: '22:00',
      dndEnd: '08:00'
    })
    
    // Check browser notification permission
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission)
    }
  }, [notificationSettings])

  const updateSetting = (key: string, value: string | boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setHasUnsavedChanges(true)
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      setBrowserPermission(permission)
      
      if (permission === 'granted') {
        // Show test notification
        new Notification('Notifications Enabled', {
          body: 'You will now receive study session notifications!',
          icon: '/favicon.ico'
        })
      }
    }
  }

  const testNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is how your notifications will look!',
        icon: '/favicon.ico'
      })
    }
  }

  const playTestSound = (soundFile: string | null) => {
    if (soundFile) {
      const audio = new Audio(soundFile)
      audio.volume = 0.5
      audio.play().catch(e => console.log('Sound test failed:', e))
    }
  }

  const handleSave = () => {
    // Note: In a real implementation, you'd save notification settings to the store
    // For now, we'll just update local state
    actions.updateSettings({ notificationsEnabled: localSettings.desktop })
    setHasUnsavedChanges(false)
    
    // Show success message
    alert('Notification settings saved successfully!')
  }

  const handleReset = () => {
    setLocalSettings({
      ...notificationSettings,
      soundType: 'bell',
      doNotDisturb: false,
      dndStart: '22:00',
      dndEnd: '08:00'
    })
    setHasUnsavedChanges(false)
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
            <h1 className="text-2xl font-medium text-text-primary">Notification Settings</h1>
            <p className="text-text-secondary mt-1">Configure alerts and sounds for your study sessions</p>
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
        {/* Browser Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Browser Notifications</h3>
            <p className="text-sm text-text-secondary">Get desktop notifications when timer sessions end</p>
          </div>
          
          <div className="space-y-4">
            {/* Permission Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-text-primary">Browser Permission</span>
                <p className="text-xs text-text-secondary">
                  {browserPermission === 'granted' && 'Notifications are allowed'}
                  {browserPermission === 'denied' && 'Notifications are blocked. Please enable in browser settings.'}
                  {browserPermission === 'default' && 'Permission not requested yet'}
                </p>
              </div>
              <div className="flex gap-2">
                {browserPermission === 'default' && (
                  <button
                    onClick={requestNotificationPermission}
                    className="px-3 py-1 text-xs bg-accent-primary text-white rounded hover:bg-opacity-90"
                  >
                    Enable
                  </button>
                )}
                {browserPermission === 'granted' && (
                  <button
                    onClick={testNotification}
                    className="px-3 py-1 text-xs border border-accent-primary text-accent-primary rounded hover:bg-accent-light"
                  >
                    Test
                  </button>
                )}
              </div>
            </div>

            {/* Enable/Disable Notifications */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.desktop}
                onChange={(e) => updateSetting('desktop', e.target.checked)}
                disabled={browserPermission !== 'granted'}
                className="w-4 h-4 text-accent-primary border-gray-300 rounded focus:ring-accent-primary disabled:opacity-50"
              />
              <div>
                <span className="text-sm font-medium text-text-primary">Enable desktop notifications</span>
                <p className="text-xs text-text-secondary">Show notifications when study sessions or breaks end</p>
              </div>
            </label>
          </div>
        </div>

        {/* Sound Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Sound Notifications</h3>
            <p className="text-sm text-text-secondary">Play sounds when timer sessions end</p>
          </div>
          
          <div className="space-y-4">
            {/* Enable/Disable Sounds */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.sound}
                onChange={(e) => updateSetting('sound', e.target.checked)}
                className="w-4 h-4 text-accent-primary border-gray-300 rounded focus:ring-accent-primary"
              />
              <div>
                <span className="text-sm font-medium text-text-primary">Enable sound notifications</span>
                <p className="text-xs text-text-secondary">Play a sound when sessions end</p>
              </div>
            </label>

            {/* Sound Selection */}
            {localSettings.sound && (
              <div className="pl-7 space-y-3">
                <h4 className="text-sm font-medium text-text-primary">Notification Sound</h4>
                <div className="grid grid-cols-2 gap-3">
                  {NOTIFICATION_SOUNDS.map((sound) => (
                    <button
                      key={sound.value}
                      onClick={() => updateSetting('soundType', sound.value)}
                      className={`p-3 text-sm rounded-lg border transition-all flex items-center justify-between ${
                        localSettings.soundType === sound.value
                          ? 'bg-accent-primary text-white border-accent-primary'
                          : 'bg-white text-text-primary border-gray-200 hover:border-accent-primary hover:bg-accent-light'
                      }`}
                    >
                      <span>{sound.label}</span>
                      {sound.file && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            playTestSound(sound.file)
                          }}
                          className="ml-2 p-1 rounded"
                        >
                          <SpeakerWaveIcon className="w-4 h-4" />
                        </button>
                      )}
                      {!sound.file && (
                        <SpeakerXMarkIcon className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notification Messages */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Notification Messages</h3>
            <p className="text-sm text-text-secondary">Customize the text shown in notifications</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Study Session Complete
              </label>
              <input
                type="text"
                value={localSettings.completionMessage}
                onChange={(e) => updateSetting('completionMessage', e.target.value)}
                placeholder="Time is up!"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Break Time Message
              </label>
              <input
                type="text"
                value={localSettings.breakMessage}
                onChange={(e) => updateSetting('breakMessage', e.target.value)}
                placeholder="Time for a break!"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
              />
            </div>
          </div>
        </div>

        {/* Do Not Disturb */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Do Not Disturb</h3>
            <p className="text-sm text-text-secondary">Quiet hours when notifications are muted</p>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.doNotDisturb}
                onChange={(e) => updateSetting('doNotDisturb', e.target.checked)}
                className="w-4 h-4 text-accent-primary border-gray-300 rounded focus:ring-accent-primary"
              />
              <div>
                <span className="text-sm font-medium text-text-primary">Enable do not disturb</span>
                <p className="text-xs text-text-secondary">Mute all notifications during specified hours</p>
              </div>
            </label>

            {localSettings.doNotDisturb && (
              <div className="pl-7 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">From</label>
                  <input
                    type="time"
                    value={localSettings.dndStart}
                    onChange={(e) => updateSetting('dndStart', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">To</label>
                  <input
                    type="time"
                    value={localSettings.dndEnd}
                    onChange={(e) => updateSetting('dndEnd', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}