import { Card } from '@/components/ui/Card'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-sans text-heading-lg mb-2 text-text-primary">Total Study Time</h3>
          <p className="text-display-md font-light text-text-primary">4h 32m</p>
          <p className="text-caption text-text-secondary">Today</p>
        </Card>
        
        <Card>
          <h3 className="font-sans text-heading-lg mb-2 text-text-primary">Sessions Completed</h3>
          <p className="text-display-md font-light text-text-primary">12</p>
          <p className="text-caption text-text-secondary">Pomodoro sessions</p>
        </Card>
        
        <Card>
          <h3 className="font-sans text-heading-lg mb-2 text-text-primary">Weekly Progress</h3>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-accent rounded-full h-2">
              <div className="bg-accent-focus rounded-full h-2 w-[85%] transition-all duration-300"></div>
            </div>
            <span className="text-display-md font-light text-text-primary">85%</span>
          </div>
          <p className="text-caption text-text-secondary mt-1">28h / 33h goal</p>
        </Card>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-sans text-heading-lg mb-4 text-text-primary">Recent Sessions</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-accent">
              <div>
                <p className="text-body-md font-medium text-text-primary">Mathematics</p>
                <p className="text-caption text-text-secondary">25 min • 2:30 PM</p>
              </div>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-accent">
              <div>
                <p className="text-body-md font-medium text-text-primary">Physics</p>
                <p className="text-caption text-text-secondary">25 min • 1:00 PM</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-body-md font-medium text-text-primary">Chemistry</p>
                <p className="text-caption text-text-secondary">25 min • 11:30 AM</p>
              </div>
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            </div>
          </div>
        </Card>
        
        <Card>
          <h3 className="font-sans text-heading-lg mb-4 text-text-primary">Subject Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-body-md text-text-primary">Mathematics</span>
              </div>
              <span className="text-body-md font-medium text-text-primary">2h 15m</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-body-md text-text-primary">Physics</span>
              </div>
              <span className="text-body-md font-medium text-text-primary">1h 45m</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-body-md text-text-primary">Chemistry</span>
              </div>
              <span className="text-body-md font-medium text-text-primary">32m</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}