'use client'

import { forwardRef } from 'react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label className="flex items-start cursor-pointer">
        <input
          ref={ref}
          type="checkbox"
          className={`
            mt-1 h-4 w-4 rounded border-border-subtle
            text-accent-primary focus:ring-accent-primary focus:ring-2
            ${className}
          `}
          {...props}
        />
        {label && (
          <span className="ml-2 text-body-md text-text-primary">
            {label}
          </span>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'