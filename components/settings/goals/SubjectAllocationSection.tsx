'use client'

import { AcademicCapIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { SubjectAllocationSectionProps } from '@/types/settings'
import { formatMinutes, proportionToMinutes } from '@/lib/settings/calculations'

export default function SubjectAllocationSection({
  subjects,
  allocations,
  weeklyGoal,
  onAllocationChange,
  onRebalance
}: SubjectAllocationSectionProps) {
  const totalAllocated = Object.values(allocations).reduce(
    (sum, allocation) => sum + allocation.proportion, 
    0
  )
  const unallocatedProportion = Math.max(0, 1 - totalAllocated)
  const unallocatedMinutes = proportionToMinutes(unallocatedProportion, weeklyGoal)

  const handleSliderChange = (subjectId: string, value: number) => {
    const proportion = value / 100 // Convert percentage to proportion
    onAllocationChange(subjectId, proportion)
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-accent">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <AcademicCapIcon className="h-6 w-6 text-accent-primary" />
          <h3 className="text-lg font-medium text-text-primary">Subject Time Allocation</h3>
        </div>
        
        {/* Rebalance Button */}
        <button
          onClick={onRebalance}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border border-accent rounded-lg hover:bg-accent-light transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Distribute Equally
        </button>
      </div>

      <div className="space-y-4">
        {/* Total Weekly Goal Reminder */}
        <div className="bg-accent-light rounded-lg p-3">
          <p className="text-sm text-text-secondary">
            Weekly Goal: <span className="font-medium text-text-primary">{formatMinutes(weeklyGoal)}</span>
          </p>
        </div>

        {/* Subject Allocations */}
        <div className="space-y-3">
          {subjects.map((subject) => {
            const allocation = allocations[subject.id.toString()] || {
              proportion: 0,
              subject_name: subject.name,
              color_hex: subject.color_hex
            }
            const percentage = Math.round(allocation.proportion * 100)
            const minutes = proportionToMinutes(allocation.proportion, weeklyGoal)

            return (
              <div key={subject.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: subject.color_hex }}
                    />
                    <span className="text-sm font-medium text-text-primary">
                      {subject.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-text-secondary">
                      {formatMinutes(minutes)}
                    </span>
                    <span className="text-sm text-text-secondary ml-2">
                      ({percentage}%)
                    </span>
                  </div>
                </div>
                
                {/* Slider */}
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={percentage}
                    onChange={(e) => handleSliderChange(subject.id.toString(), parseInt(e.target.value))}
                    className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, ${subject.color_hex} 0%, ${subject.color_hex} ${percentage}%, #E8E0D1 ${percentage}%, #E8E0D1 100%)`
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Unallocated Time */}
        {unallocatedMinutes > 0 && (
          <div className="mt-4 p-3 bg-color-warning bg-opacity-10 rounded-lg">
            <p className="text-sm text-color-warning">
              ⚠️ Unallocated time: <span className="font-medium">{formatMinutes(unallocatedMinutes)}</span>
              {' '}({Math.round(unallocatedProportion * 100)}%)
            </p>
            <p className="text-xs text-text-secondary mt-1">
              This time will be automatically assigned to &quot;Other&quot; category if enabled.
            </p>
          </div>
        )}

        {/* Visual Distribution */}
        <div className="mt-4">
          <p className="text-sm text-text-secondary mb-2">Visual Distribution</p>
          <div className="flex h-8 rounded-lg overflow-hidden">
            {subjects.map((subject) => {
              const allocation = allocations[subject.id.toString()]
              if (!allocation || allocation.proportion === 0) return null
              
              return (
                <div
                  key={subject.id}
                  className="relative group"
                  style={{
                    backgroundColor: subject.color_hex,
                    width: `${allocation.proportion * 100}%`
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white font-medium">
                      {Math.round(allocation.proportion * 100)}%
                    </span>
                  </div>
                </div>
              )
            })}
            {unallocatedProportion > 0 && (
              <div
                className="bg-gray-300 relative group"
                style={{ width: `${unallocatedProportion * 100}%` }}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-gray-700 font-medium">
                    {Math.round(unallocatedProportion * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

{/* Add custom styles for the range slider */}
<style jsx>{`
  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: white;
    border: 2px solid #5D737E;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: white;
    border: 2px solid #5D737E;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
`}</style>