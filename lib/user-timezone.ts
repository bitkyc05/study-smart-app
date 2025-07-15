import { getServerClient } from '@/lib/supabase/server'
import { cache } from 'react'

/**
 * Get user's selected timezone from database
 * Uses React cache to avoid redundant DB calls per request
 * @returns User's timezone (IANA format) or UTC as fallback
 */
export const getUserTimezone = cache(async (): Promise<string> => {
  try {
    const supabase = await getServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return 'UTC' // Fallback for unauthenticated users
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('timezone')
      .eq('user_id', user.id)
      .single()

    if (error || !data || !data.timezone) {
      // Fallback if not set - will be handled by auto-setting on client
      return 'UTC'
    }

    return data.timezone
  } catch (error) {
    console.error('Error getting user timezone:', error)
    return 'UTC'
  }
})

/**
 * Update user's timezone setting
 * @param timezone IANA timezone identifier (e.g., 'Asia/Seoul')
 */
export async function updateUserTimezone(timezone: string): Promise<void> {
  try {
    const supabase = await getServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        timezone: timezone
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Error updating user timezone:', error)
    throw error
  }
}

