'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  ClockIcon, 
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

const sidebarItems = [
  { name: 'Dashboard', icon: HomeIcon, href: '/dashboard' },
  { name: 'Pomodoro', icon: ClockIcon, href: '/pomodoro' },
  { name: 'Weekly', icon: ChartBarIcon, href: '/weekly' },
  { name: 'Calendar', icon: CalendarDaysIcon, href: '/calendar' },
  { name: 'AI Chat', icon: ChatBubbleLeftRightIcon, href: '/ai-chat' },
]

interface SidebarItemProps {
  name: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href: string
  isActive: boolean
  isCollapsed: boolean
}

function SidebarItem({ name, icon: Icon, href, isActive, isCollapsed }: SidebarItemProps) {
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
      title={isCollapsed ? name : undefined}
    >
      <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
      {!isCollapsed && <span className="truncate">{name}</span>}
    </Link>
  )
}

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={`fixed inset-y-0 left-0 bg-background border-r border-accent shadow-sm transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* 접기/펼치기 버튼 */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 bg-background border border-accent rounded-full p-1 shadow-sm hover:bg-accent-light transition-colors"
      >
        {isCollapsed ? (
          <ChevronRightIcon className="h-4 w-4 text-text-secondary" />
        ) : (
          <ChevronLeftIcon className="h-4 w-4 text-text-secondary" />
        )}
      </button>

      <div className="p-6">
        {!isCollapsed ? (
          <>
            <h1 className="font-serif text-display-md text-text-primary">
              Study Smart
            </h1>
            <p className="text-caption text-text-secondary mt-1">
              Intelligent Time Management
            </p>
          </>
        ) : (
          <div className="text-center">
            <div className="w-8 h-8 mx-auto bg-accent-primary rounded-full flex items-center justify-center">
              <span className="font-serif text-lg font-bold text-white">S</span>
            </div>
          </div>
        )}
      </div>
      
      <nav className="mt-8">
        {sidebarItems.map((item) => (
          <SidebarItem
            key={item.name}
            name={item.name}
            icon={item.icon}
            href={item.href}
            isActive={pathname === item.href}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>
      
      {!isCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-accent">
          <div className="text-center">
            <p className="text-caption text-text-secondary">
              Focus • Progress • Success
            </p>
          </div>
        </div>
      )}
    </div>
  )
}