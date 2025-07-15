export default function WeeklyViewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Week Selector Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Heatmap Skeleton */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-96 bg-gray-100 rounded animate-pulse" />
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>

      {/* Timeline Skeleton */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}