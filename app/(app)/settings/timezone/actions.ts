'use server'

import { getServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUserTimezone(timezone: string) {
  try {
    const supabase = await getServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    // Validate timezone format (basic check)
    if (!timezone || typeof timezone !== 'string') {
      throw new Error('Invalid timezone format')
    }

    // Update or insert user timezone setting
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        timezone: timezone,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Database error:', error)
      throw new Error('Failed to update timezone setting')
    }

    // Revalidate relevant paths to update cached data
    revalidatePath('/settings/timezone')
    revalidatePath('/dashboard')
    revalidatePath('/weekly')
    revalidatePath('/calendar')
    
    return { success: true }
  } catch (error) {
    console.error('Error updating timezone:', error)
    throw error
  }
}