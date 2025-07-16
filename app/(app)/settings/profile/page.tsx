'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeftIcon, UserIcon, EnvelopeIcon, CalendarIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export default function ProfileSettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: ''
  })
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Get profile data
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error loading profile:', error)
        } else {
          const fullProfile = {
            ...profileData,
            email: user.email || '',
            created_at: user.created_at,
            updated_at: user.updated_at || user.created_at
          }
          setProfile(fullProfile)
          setFormData({
            full_name: profileData?.full_name || '',
            email: user.email || ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name
        })
        .eq('id', profile.id)

      if (error) {
        console.error('Error updating profile:', error)
        alert('Failed to update profile')
      } else {
        setProfile(prev => prev ? { ...prev, full_name: formData.full_name } : null)
        setEditing(false)
        alert('Profile updated successfully!')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    }
  }

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      email: profile?.email || ''
    })
    setEditing(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-accent-light rounded w-1/3"></div>
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
          <div>
            <h1 className="text-2xl font-medium text-text-primary">Profile Settings</h1>
            <p className="text-text-secondary mt-1">Manage your account information and study preferences</p>
          </div>
          
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 text-sm bg-accent-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Edit Profile
            </button>
          )}
          
          {editing && (
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Basic Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Full Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-text-primary">
                    <UserIcon className="w-4 h-4" />
                    <span>{profile?.full_name || 'Not set'}</span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Email Address
                </label>
                <div className="flex items-center gap-2 text-text-secondary">
                  <EnvelopeIcon className="w-4 h-4" />
                  <span>{profile?.email}</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">Cannot be changed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Account Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm font-medium text-text-primary">Member Since</span>
                </div>
                <span className="text-sm text-text-secondary">
                  {profile?.created_at ? formatDate(profile.created_at) : 'Unknown'}
                </span>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm font-medium text-text-primary">Last Updated</span>
                </div>
                <span className="text-sm text-text-secondary">
                  {profile?.updated_at ? formatDate(profile.updated_at) : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Study Profile */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Study Profile</h3>
            <p className="text-sm text-text-secondary mb-4">
              View your detailed study statistics, achievements, and learning patterns.
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-accent-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
            >
              <ChartBarIcon className="w-4 h-4" />
              View Full Profile
            </button>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Quick Overview</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Total Sessions</span>
                <span className="font-medium text-text-primary">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Study Time</span>
                <span className="font-medium text-text-primary">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Current Level</span>
                <span className="font-medium text-text-primary">-</span>
              </div>
            </div>
            <p className="text-xs text-text-secondary mt-3">
              Visit your full profile for detailed statistics
            </p>
          </div>

          {/* Account Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Account Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/settings/timezone')}
                className="w-full px-4 py-2 text-sm border border-gray-300 text-text-primary rounded-lg hover:bg-gray-50 transition-colors"
              >
                Change Timezone
              </button>
              <button
                onClick={() => router.push('/settings/goals')}
                className="w-full px-4 py-2 text-sm border border-gray-300 text-text-primary rounded-lg hover:bg-gray-50 transition-colors"
              >
                Study Goals
              </button>
              <button
                onClick={async () => {
                  if (confirm('Are you sure you want to sign out?')) {
                    await supabase.auth.signOut()
                    router.push('/login')
                  }
                }}
                className="w-full px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}