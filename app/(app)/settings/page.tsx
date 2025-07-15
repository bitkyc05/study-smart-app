import Link from 'next/link';
import { 
  Target, 
  Bell, 
  Clock,
  ChevronRight,
  Palette,
  User,
  BookOpen,
  Globe
} from 'lucide-react';

const settingsSections = [
  {
    title: 'Study Management',
    items: [
      {
        icon: Target,
        label: 'Study Goals',
        description: 'Set D-day goals and allocate study time',
        href: '/settings/goals',
        color: 'text-blue-500 bg-blue-50'
      },
      {
        icon: BookOpen,
        label: 'Subject Management',
        description: 'Add, edit, and organize your study subjects',
        href: '/settings/subjects',
        color: 'text-orange-500 bg-orange-50'
      },
      {
        icon: Clock,
        label: 'Timer Settings',
        description: 'Pomodoro timer and break durations',
        href: '/settings/timer',
        color: 'text-green-500 bg-green-50'
      }
    ]
  },
  {
    title: 'Preferences',
    items: [
      {
        icon: Globe,
        label: 'Timezone',
        description: 'Set your timezone for accurate time display',
        href: '/settings/timezone',
        color: 'text-indigo-500 bg-indigo-50'
      },
      {
        icon: Palette,
        label: 'Appearance',
        description: 'Theme and display preferences',
        href: '/settings/appearance',
        color: 'text-purple-500 bg-purple-50'
      },
      {
        icon: Bell,
        label: 'Notifications',
        description: 'Alert sounds and browser notifications',
        href: '/settings/notifications',
        color: 'text-yellow-500 bg-yellow-50'
      }
    ]
  },
  {
    title: 'Account',
    items: [
      {
        icon: User,
        label: 'Profile',
        description: 'Your account information',
        href: '/settings/profile',
        color: 'text-gray-500 bg-gray-50'
      }
    ]
  }
];

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your study preferences and account settings</p>
      </div>

      <div className="space-y-8">
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-semibold mb-4 text-gray-700">
              {section.title}
            </h2>
            
            <div className="space-y-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block group"
                >
                  <div className="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${item.color}`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.label}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.description}
                        </p>
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}