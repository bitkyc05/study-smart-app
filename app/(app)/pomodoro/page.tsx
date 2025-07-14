import { Card } from '@/components/ui/Card'

export default function PomodoroPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Card className="text-center">
        <div className="mb-8">
          <h2 className="font-serif text-display-md text-text-primary mb-2">
            Pomodoro Timer
          </h2>
          <p className="text-body-md text-text-secondary">
            Focus session with subject selection
          </p>
        </div>
        
        <div className="mb-8">
          <div className="text-timer-display font-light text-text-primary mb-4">
            25:00
          </div>
          <p className="text-body-md text-text-secondary">Focus Session</p>
        </div>
        
        <div className="mb-8">
          <select className="w-full px-4 py-2 border border-accent rounded-lg text-body-md text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-accent-focus">
            <option>Select Subject</option>
            <option>Mathematics</option>
            <option>Physics</option>
            <option>Chemistry</option>
            <option>Biology</option>
          </select>
        </div>
        
        <div className="flex justify-center space-x-4">
          <button className="px-6 py-3 bg-accent-focus text-white rounded-lg text-body-lg font-medium hover:bg-accent-dark transition-colors">
            Start
          </button>
          <button className="px-6 py-3 bg-accent text-text-primary rounded-lg text-body-lg font-medium hover:bg-accent-dark transition-colors">
            Reset
          </button>
        </div>
      </Card>
      
      <Card>
        <h3 className="font-sans text-heading-lg mb-4 text-text-primary">Today's Sessions</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-accent">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-body-md font-medium text-text-primary">Mathematics</p>
                <p className="text-caption text-text-secondary">Completed at 2:30 PM</p>
              </div>
            </div>
            <span className="text-body-md text-text-primary">25 min</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-accent">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-body-md font-medium text-text-primary">Physics</p>
                <p className="text-caption text-text-secondary">Completed at 1:00 PM</p>
              </div>
            </div>
            <span className="text-body-md text-text-primary">25 min</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-body-md font-medium text-text-primary">Chemistry</p>
                <p className="text-caption text-text-secondary">Completed at 11:30 AM</p>
              </div>
            </div>
            <span className="text-body-md text-text-primary">25 min</span>
          </div>
        </div>
      </Card>
    </div>
  )
}