'use client'

import { forwardRef } from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={props.id} 
            className="block text-body-md font-medium text-text-primary mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-3 py-2 border rounded-md text-body-md
              bg-white text-text-primary placeholder-text-secondary
              focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent
              disabled:bg-gray-50 disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-red-500' : 'border-border-subtle'}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-caption text-red-500">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'