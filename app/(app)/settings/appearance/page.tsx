'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeftIcon, SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: SunIcon, description: 'Clean and bright interface' },
  { value: 'dark', label: 'Dark', icon: MoonIcon, description: 'Easy on the eyes' },
  { value: 'system', label: 'System', icon: ComputerDesktopIcon, description: 'Follow system preference' }
]

const COLOR_SCHEMES = [
  { value: 'default', label: 'Study Smart', color: 'bg-[#5D737E]', description: 'Default warm beige theme' },
  { value: 'blue', label: 'Ocean Blue', color: 'bg-blue-500', description: 'Cool and calming' },
  { value: 'green', label: 'Forest Green', color: 'bg-green-500', description: 'Natural and focused' },
  { value: 'purple', label: 'Deep Purple', color: 'bg-purple-500', description: 'Creative and inspiring' },
  { value: 'orange', label: 'Sunset Orange', color: 'bg-orange-500', description: 'Energetic and warm' },
  { value: 'pink', label: 'Soft Pink', color: 'bg-pink-500', description: 'Gentle and soothing' }
]

const FONT_SIZES = [
  { value: 'small', label: 'Small', description: 'Compact interface' },
  { value: 'medium', label: 'Medium', description: 'Default size (recommended)' },
  { value: 'large', label: 'Large', description: 'Easier to read' }
]

const ANIMATION_OPTIONS = [
  { value: 'reduced', label: 'Reduced', description: 'Minimal animations for better performance' },
  { value: 'normal', label: 'Normal', description: 'Smooth transitions and animations' },
  { value: 'enhanced', label: 'Enhanced', description: 'Rich animations and effects' }
]

export default function AppearanceSettingsPage() {
  const router = useRouter()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [settings, setSettings] = useState({
    theme: 'system',
    colorScheme: 'default',
    fontSize: 'medium',
    animations: 'normal',
    compactMode: false,
    highContrast: false,
    reduceMotion: false
  })

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('appearance-settings')
    if (saved) {
      setSettings(JSON.parse(saved))
    }
  }, [])

  const updateSetting = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasUnsavedChanges(true)
    
    // Apply setting immediately for preview
    applySettings({ ...settings, [key]: value })
  }

  const applySettings = (newSettings: typeof settings) => {
    const root = document.documentElement
    
    // Apply theme
    if (newSettings.theme === 'dark') {
      root.classList.add('dark')
    } else if (newSettings.theme === 'light') {
      root.classList.remove('dark')
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    
    // Apply font size
    root.style.fontSize = newSettings.fontSize === 'small' ? '14px' : 
                          newSettings.fontSize === 'large' ? '18px' : '16px'
    
    // Apply other settings (in a real app, you'd implement these CSS variables)
    root.style.setProperty('--animation-speed', 
      newSettings.animations === 'reduced' ? '0.1s' :
      newSettings.animations === 'enhanced' ? '0.5s' : '0.3s'
    )
    
    if (newSettings.reduceMotion) {
      root.style.setProperty('--animation-speed', '0s')
    }
  }

  const handleSave = () => {
    localStorage.setItem('appearance-settings', JSON.stringify(settings))
    applySettings(settings)
    setHasUnsavedChanges(false)
    
    // Show success message
    alert('Appearance settings saved successfully!')
  }

  const handleReset = () => {
    const saved = localStorage.getItem('appearance-settings')
    if (saved) {
      const savedSettings = JSON.parse(saved)
      setSettings(savedSettings)
      applySettings(savedSettings)
    }
    setHasUnsavedChanges(false)
  }

  const resetToDefaults = () => {
    const defaultSettings = {
      theme: 'system',
      colorScheme: 'default',
      fontSize: 'medium',
      animations: 'normal',
      compactMode: false,
      highContrast: false,
      reduceMotion: false
    }
    setSettings(defaultSettings)
    applySettings(defaultSettings)
    setHasUnsavedChanges(true)
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
            <h1 className="text-2xl font-medium text-text-primary">Appearance Settings</h1>
            <p className="text-text-secondary mt-1">Customize the look and feel of Study Smart</p>
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
        {/* Theme */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Theme</h3>
            <p className="text-sm text-text-secondary">Choose between light, dark, or system theme</p>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((theme) => (
              <button
                key={theme.value}
                onClick={() => updateSetting('theme', theme.value)}
                className={`p-4 rounded-lg border transition-all text-left ${
                  settings.theme === theme.value
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-white text-text-primary border-gray-200 hover:border-accent-primary hover:bg-accent-light'
                }`}
              >
                <theme.icon className="w-6 h-6 mb-2" />
                <div className="font-medium">{theme.label}</div>
                <div className="text-xs opacity-75 mt-1">{theme.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Color Scheme */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Color Scheme</h3>
            <p className="text-sm text-text-secondary">Select your preferred accent color</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {COLOR_SCHEMES.map((scheme) => (
              <button
                key={scheme.value}
                onClick={() => updateSetting('colorScheme', scheme.value)}
                className={`p-3 rounded-lg border transition-all text-left ${
                  settings.colorScheme === scheme.value
                    ? 'border-accent-primary bg-accent-light'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-4 h-4 rounded-full ${scheme.color}`}></div>
                  <span className="font-medium text-sm">{scheme.label}</span>
                </div>
                <p className="text-xs text-text-secondary">{scheme.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Font Size</h3>
            <p className="text-sm text-text-secondary">Adjust text size for better readability</p>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {FONT_SIZES.map((size) => (
              <button
                key={size.value}
                onClick={() => updateSetting('fontSize', size.value)}
                className={`p-3 rounded-lg border transition-all text-left ${
                  settings.fontSize === size.value
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-white text-text-primary border-gray-200 hover:border-accent-primary hover:bg-accent-light'
                }`}
              >
                <div className="font-medium text-sm">{size.label}</div>
                <div className="text-xs opacity-75 mt-1">{size.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Animations */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Animations</h3>
            <p className="text-sm text-text-secondary">Control animation and transition effects</p>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            {ANIMATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updateSetting('animations', option.value)}
                className={`p-3 rounded-lg border transition-all text-left ${
                  settings.animations === option.value
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-white text-text-primary border-gray-200 hover:border-accent-primary hover:bg-accent-light'
                }`}
              >
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs opacity-75 mt-1">{option.description}</div>
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(e) => updateSetting('reduceMotion', e.target.checked)}
              className="w-4 h-4 text-accent-primary border-gray-300 rounded focus:ring-accent-primary"
            />
            <div>
              <span className="text-sm font-medium text-text-primary">Respect system motion preferences</span>
              <p className="text-xs text-text-secondary">Disable animations if system prefers reduced motion</p>
            </div>
          </label>
        </div>

        {/* Accessibility */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Accessibility</h3>
            <p className="text-sm text-text-secondary">Options to improve accessibility and usability</p>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => updateSetting('highContrast', e.target.checked)}
                className="w-4 h-4 text-accent-primary border-gray-300 rounded focus:ring-accent-primary"
              />
              <div>
                <span className="text-sm font-medium text-text-primary">High contrast mode</span>
                <p className="text-xs text-text-secondary">Increase contrast for better visibility</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.compactMode}
                onChange={(e) => updateSetting('compactMode', e.target.checked)}
                className="w-4 h-4 text-accent-primary border-gray-300 rounded focus:ring-accent-primary"
              />
              <div>
                <span className="text-sm font-medium text-text-primary">Compact mode</span>
                <p className="text-xs text-text-secondary">Reduce spacing and padding for more content</p>
              </div>
            </label>
          </div>
        </div>

        {/* Reset to Defaults */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-text-primary">Reset Settings</h3>
            <p className="text-sm text-text-secondary">Restore all appearance settings to their default values</p>
          </div>
          
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  )
}