'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function ConfirmEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // The actual email confirmation is handled by the callback route
    // This page is just for showing the result
    const searchParams = new URLSearchParams(window.location.search)
    const confirmed = searchParams.get('confirmed')
    const error = searchParams.get('error')

    if (confirmed === 'true') {
      setStatus('success')
      setMessage('Your email has been confirmed successfully! You can now log in to your account.')
    } else if (error) {
      setStatus('error')
      setMessage('Failed to confirm your email. The link may have expired or is invalid.')
    } else {
      // If no params, user might have navigated here directly
      setStatus('error')
      setMessage('Invalid confirmation link.')
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="mb-4">
              <svg className="animate-spin h-12 w-12 mx-auto text-accent-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="font-serif text-display-sm text-text-primary mb-2">
              Confirming your email...
            </h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-4">
              <svg className="h-16 w-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-serif text-display-sm text-text-primary mb-2">
              Email Confirmed!
            </h2>
            <p className="text-body-md text-text-secondary mb-6">
              {message}
            </p>
            <Link href="/login">
              <Button fullWidth size="lg">
                Go to Login
              </Button>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4">
              <svg className="h-16 w-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-serif text-display-sm text-text-primary mb-2">
              Confirmation Failed
            </h2>
            <p className="text-body-md text-text-secondary mb-6">
              {message}
            </p>
            <div className="space-y-3">
              <Link href="/signup">
                <Button fullWidth size="lg" variant="outline">
                  Sign Up Again
                </Button>
              </Link>
              <Link href="/login">
                <Button fullWidth size="lg">
                  Go to Login
                </Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}