'use client'

import { useRouter } from 'next/navigation'
import { addWeeks, subWeeks, format } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface WeekSelectorProps {
  currentDate: Date
}

export default function WeekSelector({ currentDate }: WeekSelectorProps) {
  const router = useRouter()

  const handlePrevWeek = () => {
    const prevWeek = subWeeks(currentDate, 1)
    router.push(`/weekly?date=${format(prevWeek, 'yyyy-MM-dd')}`)
  }

  const handleNextWeek = () => {
    const nextWeek = addWeeks(currentDate, 1)
    router.push(`/weekly?date=${format(nextWeek, 'yyyy-MM-dd')}`)
  }

  const handleThisWeek = () => {
    router.push('/weekly')
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePrevWeek}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="이전 주"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>

      <button
        onClick={handleThisWeek}
        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        이번 주
      </button>

      <button
        onClick={handleNextWeek}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="다음 주"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </div>
  )
}