'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()
      
      // Get the code from the URL
      const code = new URLSearchParams(window.location.search).get('code')
      
      if (code) {
        try {
          // Exchange the code for a session
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (!error) {
            // Success - redirect to dashboard
            router.push('/dashboard')
          } else {
            console.error('OAuth callback error:', error)
            router.push('/login?error=oauth_failed')
          }
        } catch (err) {
          console.error('OAuth callback error:', err)
          router.push('/login?error=oauth_failed')
        }
      } else {
        // No code present, redirect to login
        router.push('/login')
      }
    }

    handleCallback()
  }, [router])

  return (
    <Card className="p-8 text-center">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
        <p className="text-body-md text-text-secondary">
          Completing sign in...
        </p>
      </div>
    </Card>
  )
}