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
          <div className="relative flex items-center justify-center mb-4">
            <svg className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 transform -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="var(--accent-light)"
                strokeWidth="8"
              />
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="534"
                strokeDashoffset="133"
                className="transition-all duration-1000 ease-in-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-light text-text-primary">25:00</div>
                <div className="text-body-md text-text-secondary mt-2">Focus Session</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <select className="w-full px-4 py-2 border border-accent rounded-lg text-body-md text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-accent-focus">
            <option>Others (Select Sessions)</option>
            <option>Mathematics</option>
            <option>Physics</option>
            <option>Chemistry</option>
            <option>Biology</option>
            <option>Others</option>
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
        <h3 className="font-sans text-heading-lg mb-4 text-text-primary">Today&apos;s Sessions</h3>
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