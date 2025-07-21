import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/dashboard/StatCard'
import { getDashboardStats, formatDuration, formatTime } from '@/lib/dashboard-helpers'
import { WeeklyBarChart } from '@/components/charts/WeeklyBarChart'
import { SubjectPieChart } from '@/components/charts/SubjectPieChart'
import { TodayRadialChart } from '@/components/charts/TodayRadialChart'
import { RefreshButton } from '@/components/dashboard/RefreshButton'
import { DdayProgressChart } from '@/components/charts/DdayProgressChart'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-body-lg text-text-secondary">Failed to load dashboard data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans text-display-md text-text-primary">Dashboard</h1>
          <p className="text-body-md text-text-secondary mt-1">Track your study progress</p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <StatCard
          title="Today's Study Time"
          value={formatDuration(stats.todayStudyTime)}
          subtitle={`${stats.todaySessionCount} sessions completed`}
        />
        
        <StatCard
          title="Weekly Total"
          value={formatDuration(stats.weeklyStudyTime)}
          subtitle="This week's study time"
        />
        
        <StatCard
          title="Weekly Progress"
          value={
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-accent rounded-full h-2">
                <div 
                  className="bg-accent-focus rounded-full h-2 transition-all duration-300"
                  style={{ width: `${Math.min(stats.weeklyProgress, 100)}%` }}
                />
              </div>
              <span className="text-display-md font-light text-text-primary">
                {Math.round(stats.weeklyProgress)}%
              </span>
            </div>
          }
          subtitle={`${formatDuration(stats.weeklyStudyTime)} / ${formatDuration(stats.weeklyGoal)} goal`}
        />
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-sans text-heading-lg mb-4 text-text-primary">Today&apos;s Progress</h3>
          <div className="h-48">
            <TodayRadialChart 
              studyMinutes={Math.round(stats.todayStudyTime / 60)}
              goalMinutes={stats.dailyGoal}
            />
          </div>
        </Card>
        
        <Card className="md:col-span-2 p-6">
          <h3 className="font-sans text-heading-lg mb-4 text-text-primary">Subject Distribution</h3>
          <div className="h-48">
            <SubjectPieChart data={stats.subjectBreakdown} />
          </div>
        </Card>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 md:col-span-2">
          <h3 className="font-sans text-heading-lg mb-4 text-text-primary">Recent Sessions</h3>
          <div className="space-y-3">
            {stats.recentSessions.length === 0 ? (
              <p className="text-body-md text-text-secondary text-center py-4">
                No sessions completed yet
              </p>
            ) : (
              stats.recentSessions.slice(0, 5).map((session, index) => (
                <div 
                  key={session.id} 
                  className={`flex items-center justify-between py-2 ${
                    index < stats.recentSessions.length - 1 ? 'border-b border-accent' : ''
                  }`}
                >
                  <div>
                    <p className="text-body-md font-medium text-text-primary">
                      {session.subjects?.name || 'Other'}
                    </p>
                    <p className="text-caption text-text-secondary">
                      {formatDuration(session.duration_seconds)} • {formatTime(session.end_time)}
                    </p>
                  </div>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: session.subjects?.color_hex || '#8A7E70' }}
                  />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-1 gap-6">
        <Card className="p-6">
          <h3 className="font-sans text-heading-lg mb-4 text-text-primary">Weekly Study Trend</h3>
          <div className="h-64">
            <WeeklyBarChart data={stats.weeklyChartData} />
          </div>
        </Card>
      </div>
      
      <div className="grid md:grid-cols-1 gap-6">
        <DdayProgressChart />
      </div>
    </div>
  )
}