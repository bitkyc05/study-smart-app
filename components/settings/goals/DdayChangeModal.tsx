'use client'

import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { DdayChangeModalProps } from '@/types/settings'

export default function DdayChangeModal({
  isOpen,
  onConfirm,
  onCancel,
  currentDday,
  newDday
}: DdayChangeModalProps) {
  if (!isOpen) return null

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Not set'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-accent">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-color-warning" />
              <h3 className="text-lg font-medium text-text-primary">
                Confirm D-Day Change
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="p-4 bg-color-warning bg-opacity-10 rounded-lg">
              <p className="text-sm text-color-warning font-medium mb-2">
                ⚠️ Important Warning
              </p>
              <p className="text-sm text-text-secondary">
                Changing your D-Day will reset all accumulated study time data. 
                This action cannot be undone.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-text-secondary">Current D-Day:</span>
                <span className="text-sm font-medium text-text-primary">
                  {formatDate(currentDday)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-text-secondary">New D-Day:</span>
                <span className="text-sm font-medium text-accent-primary">
                  {formatDate(newDday)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-secondary">
                <strong>What will happen:</strong>
              </p>
              <ul className="mt-1 text-xs text-text-secondary space-y-1">
                <li>• All previous study sessions will be archived</li>
                <li>• Progress tracking will restart from zero</li>
                <li>• Weekly goals will be recalculated</li>
                <li>• Subject allocations will be preserved</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-accent">
            <button
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-accent rounded-lg text-text-primary hover:bg-accent-light transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2 px-4 bg-color-warning text-white rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Confirm Change
            </button>
          </div>
        </div>
      </div>
    </>
  )
}