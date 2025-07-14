import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface CookieStore {
  get: (name: string) => { value: string } | undefined
  set: (cookie: { name: string; value: string; [key: string]: unknown }) => void
}

export const createClient = (cookieStore: CookieStore) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export const getServerClient = async () => {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}