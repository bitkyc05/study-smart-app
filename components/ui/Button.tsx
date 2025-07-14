'use client'

import { forwardRef } from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false,
    loading = false,
    children, 
    className = '',
    disabled,
    ...props 
  }, ref) => {
    const baseClasses = 'font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variantClasses = {
      primary: 'bg-accent-primary text-white hover:bg-accent-primary-focus focus:ring-accent-primary',
      secondary: 'bg-border-subtle text-text-primary hover:bg-text-secondary hover:text-white focus:ring-border-subtle',
      ghost: 'text-text-primary hover:bg-border-subtle focus:ring-border-subtle',
      outline: 'border border-border-subtle text-text-primary hover:bg-border-subtle focus:ring-border-subtle'
    }
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-body-md',
      lg: 'px-6 py-3 text-body-lg'
    }
    
    const widthClass = fullWidth ? 'w-full' : ''
    
    return (
      <button
        ref={ref}
        className={`
          ${baseClasses} 
          ${variantClasses[variant]} 
          ${sizeClasses[size]}
          ${widthClass}
          ${className}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </span>
        ) : children}
      </button>
    )
  }
)

Button.displayName = 'Button'