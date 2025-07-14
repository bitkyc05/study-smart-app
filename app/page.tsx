import Link from 'next/link'

export default function HeroPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between p-6">
        <h1 className="font-serif text-display-md text-text-primary">Study Smart</h1>
        <div className="flex items-center space-x-6">
          <Link href="/about" className="text-body-md text-text-secondary hover:text-accent-focus transition-colors">
            About
          </Link>
          <Link href="/pricing" className="text-body-md text-text-secondary hover:text-accent-focus transition-colors">
            Pricing
          </Link>
          <Link href="/dashboard" className="px-4 py-2 bg-accent-focus text-white rounded-lg text-body-md font-medium hover:bg-accent-dark transition-colors">
            Get Started
          </Link>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[60vh]">
          <div className="space-y-8">
            <div>
              <h2 className="font-serif text-display-xl text-text-primary mb-6">
                Study Smart
              </h2>
              <p className="text-body-lg text-text-secondary mb-8">
                Enhance your learning with intelligent time management and focused study sessions using the Pomodoro technique
              </p>
              <Link 
                href="/dashboard" 
                className="inline-block px-8 py-3 bg-accent-primary text-white rounded-lg text-body-lg font-medium hover:bg-accent-primary-focus transition-colors"
              >
                Start Learning
              </Link>
            </div>
          </div>
          
          <div className="hidden lg:block relative">
            <div className="relative transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <div className="bg-accent-dark rounded-lg p-4 shadow-xl">
                <div className="bg-background rounded-lg p-6 filter blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-24 h-6 bg-accent-primary rounded"></div>
                    <div className="w-16 h-6 bg-accent rounded-full"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-surface p-4 rounded-lg">
                      <div className="w-20 h-4 bg-accent mb-2 rounded"></div>
                      <div className="w-16 h-8 bg-text-primary rounded"></div>
                    </div>
                    <div className="bg-surface p-4 rounded-lg">
                      <div className="w-20 h-4 bg-accent mb-2 rounded"></div>
                      <div className="w-16 h-8 bg-text-primary rounded"></div>
                    </div>
                    <div className="bg-surface p-4 rounded-lg">
                      <div className="w-20 h-4 bg-accent mb-2 rounded"></div>
                      <div className="w-16 h-8 bg-text-primary rounded"></div>
                    </div>
                  </div>
                  <div className="bg-surface p-4 rounded-lg">
                    <div className="w-32 h-4 bg-accent mb-3 rounded"></div>
                    <div className="space-y-2">
                      <div className="w-full h-3 bg-accent rounded"></div>
                      <div className="w-4/5 h-3 bg-accent rounded"></div>
                      <div className="w-3/4 h-3 bg-accent rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="text-center bg-white rounded-lg border border-accent p-8 shadow-sm">
            <div className="text-4xl mb-4">⏰</div>
            <h3 className="font-sans text-heading-lg text-text-primary mb-2">
              Smart Timer
            </h3>
            <p className="text-body-md text-text-secondary">
              Pomodoro technique with intelligent break suggestions and focus tracking
            </p>
          </div>
          
          <div className="text-center bg-white rounded-lg border border-accent p-8 shadow-sm">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="font-sans text-heading-lg text-text-primary mb-2">
              Progress Tracking
            </h3>
            <p className="text-body-md text-text-secondary">
              Visual analytics for your study sessions and achievement goals
            </p>
          </div>
          
          <div className="text-center bg-white rounded-lg border border-accent p-8 shadow-sm">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="font-sans text-heading-lg text-text-primary mb-2">
              Focus Mode
            </h3>
            <p className="text-body-md text-text-secondary">
              Distraction-free environment for deep work and concentrated learning
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
