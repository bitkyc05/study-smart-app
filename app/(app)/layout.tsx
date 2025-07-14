import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64">
          <Header />
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}