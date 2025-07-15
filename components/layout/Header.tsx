'use client'

import { UserCircleIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'

interface UserMenuProps {
  isOpen: boolean
  onToggle: () => void
  onSignOut: () => void
  userEmail?: string | null
  router: ReturnType<typeof useRouter>
}

function UserMenu({ isOpen, onToggle, onSignOut, userEmail, router }: UserMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent-light transition-colors"
      >
        <UserCircleIcon className="h-8 w-8 text-text-secondary" />
        <div className="text-left">
          <p className="text-body-md font-medium text-text-primary">{userEmail || 'Study User'}</p>
          <p className="text-caption text-text-secondary">Premium</p>
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-accent z-50">
          <div className="py-1">
            <button 
              onClick={() => router.push('/profile')}
              className="w-full px-4 py-2 text-left text-body-md text-text-primary hover:bg-accent-light"
            >
              Profile
            </button>
            <button 
              onClick={() => router.push('/settings')}
              className="w-full px-4 py-2 text-left text-body-md text-text-primary hover:bg-accent-light"
            >
              Settings
            </button>
            <hr className="my-1 border-accent" />
            <button 
              onClick={onSignOut}
              className="w-full px-4 py-2 text-left text-body-md text-text-primary hover:bg-accent-light"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Header() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const router = useRouter()
  
  const today = new Date()
  const formattedDate = today.toLocaleDateString(undefined, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  
  const handleSignOut = async () => {
    await signOut()
    setIsUserMenuOpen(false)
  }

  return (
    <header className="bg-white border-b border-accent px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-caption text-text-secondary">
            {formattedDate}
          </p>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="px-3 py-1 bg-accent-primary rounded-full">
                <span className="text-body-md font-medium text-white">D-15</span>
              </div>
            </div>
            <p className="text-caption text-text-secondary mt-1">D-DAY</p>
          </div>
          
          <UserMenu 
            isOpen={isUserMenuOpen} 
            onToggle={() => setIsUserMenuOpen(!isUserMenuOpen)}
            onSignOut={handleSignOut}
            userEmail={user?.email}
            router={router}
          />
        </div>
      </div>
    </header>
  )
}