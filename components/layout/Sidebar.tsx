'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  ClockIcon, 
  CalendarDaysIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

const sidebarItems = [
  { name: 'Dashboard', icon: HomeIcon, href: '/dashboard' },
  { name: 'Pomodoro', icon: ClockIcon, href: '/pomodoro' },
  { name: 'Weekly', icon: ChartBarIcon, href: '/weekly' },
  { name: 'Calendar', icon: CalendarDaysIcon, href: '/calendar' },
]

interface SidebarItemProps {
  name: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href: string
  isActive: boolean
}

function SidebarItem({ name, icon: Icon, href, isActive }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={`
        flex items-center px-6 py-3 text-body-md font-medium transition-colors
        ${isActive 
          ? 'bg-accent-light text-accent-focus border-r-2 border-accent-focus' 
          : 'text-text-secondary hover:bg-accent-light hover:text-text-primary'
        }
      `}
    >
      <Icon className="h-5 w-5 mr-3" />
      {name}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-background border-r border-accent shadow-sm">
      <div className="p-6">
        <h1 className="font-serif text-display-md text-text-primary">
          Study Smart
        </h1>
        <p className="text-caption text-text-secondary mt-1">
          Intelligent Time Management
        </p>
      </div>
      
      <nav className="mt-8">
        {sidebarItems.map((item) => (
          <SidebarItem
            key={item.name}
            name={item.name}
            icon={item.icon}
            href={item.href}
            isActive={pathname === item.href}
          />
        ))}
      </nav>
      
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-accent">
        <div className="text-center">
          <p className="text-caption text-text-secondary">
            Focus • Progress • Success
          </p>
        </div>
      </div>
    </div>
  )
}