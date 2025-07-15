import { redirect } from 'next/navigation'
import { getServerClient } from '@/lib/supabase/server'
import { getUserTimezone } from '@/lib/user-timezone'
import TimezoneForm from './TimezoneForm'

export default async function TimezonePage() {
  const supabase = await getServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const userTimezone = await getUserTimezone()

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Timezone Settings</h1>
        <p className="text-gray-600 mt-2">
          Set your timezone for accurate time display across the application
        </p>
      </div>

      <TimezoneForm userTimezone={userTimezone} />
    </div>
  )
}