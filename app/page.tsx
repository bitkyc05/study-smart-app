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
      
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="font-serif text-display-xl text-text-primary mb-6">
            Study Smart
          </h2>
          <p className="text-body-lg text-text-secondary max-w-2xl mx-auto mb-8">
            Enhance your learning with intelligent time management and focused study sessions using the Pomodoro technique
          </p>
          <Link 
            href="/dashboard" 
            className="inline-block px-8 py-3 bg-accent-focus text-white rounded-lg text-body-lg font-medium hover:bg-accent-dark transition-colors"
          >
            Start Learning
          </Link>
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
