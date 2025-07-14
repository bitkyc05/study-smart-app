'use client'

import { UserCircleIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface UserMenuProps {
  isOpen: boolean
  onToggle: () => void
}

function UserMenu({ isOpen, onToggle }: UserMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent-light transition-colors"
      >
        <UserCircleIcon className="h-8 w-8 text-text-secondary" />
        <div className="text-left">
          <p className="text-body-md font-medium text-text-primary">Study User</p>
          <p className="text-caption text-text-secondary">Premium</p>
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-accent z-50">
          <div className="py-1">
            <button className="w-full px-4 py-2 text-left text-body-md text-text-primary hover:bg-accent-light">
              Profile
            </button>
            <button className="w-full px-4 py-2 text-left text-body-md text-text-primary hover:bg-accent-light">
              Settings
            </button>
            <hr className="my-1 border-accent" />
            <button className="w-full px-4 py-2 text-left text-body-md text-text-primary hover:bg-accent-light">
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
  
  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <header className="bg-white border-b border-accent px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-caption text-text-secondary">
            {formattedDate}
          </p>
          <p className="text-heading-md font-medium text-text-primary">
            Welcome back! Ready to study?
          </p>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <div className="w-20 bg-accent rounded-full h-2">
                <div className="bg-accent-focus rounded-full h-2 w-[85%] transition-all duration-300"></div>
              </div>
              <span className="text-body-md font-medium text-text-primary">85%</span>
            </div>
            <p className="text-caption text-text-secondary mt-1">Weekly Goal</p>
          </div>
          
          <UserMenu 
            isOpen={isUserMenuOpen} 
            onToggle={() => setIsUserMenuOpen(!isUserMenuOpen)} 
          />
        </div>
      </div>
    </header>
  )
}