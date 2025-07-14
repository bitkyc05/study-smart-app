'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/providers/AuthProvider'

interface TestResult {
  success: boolean
  error?: string
  note?: string
}

interface TableTestResults {
  passed: boolean
  details: Record<string, TestResult>
}

interface RLSTestResults {
  success: boolean
  results: {
    currentUser: string
    tests: {
      profiles: TableTestResults
      subjects: TableTestResults
      study_sessions: TableTestResults
    }
  }
}

export default function TestRLSPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RLSTestResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runTests = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/test/rls')
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to run RLS tests')
      } else {
        setResults(data)
      }
    } catch (err) {
      console.error('Error running tests:', err)
      setError('Failed to run RLS tests')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌'
  }

  const getTableStatus = (passed: boolean) => {
    return passed ? (
      <span className="text-green-600 font-medium">✅ All tests passed</span>
    ) : (
      <span className="text-red-600 font-medium">❌ Some tests failed</span>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-serif mb-2">RLS Policy Test</h1>
      <p className="text-gray-600 mb-6">
        Test Row Level Security policies for all database tables
      </p>

      {!user ? (
        <Card className="p-6">
          <p className="text-red-600">You must be logged in to run RLS tests</p>
        </Card>
      ) : (
        <>
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current User</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <Button
                onClick={runTests}
                loading={loading}
                disabled={loading}
              >
                Run RLS Tests
              </Button>
            </div>
          </Card>

          {error && (
            <Card className="p-6 mb-6 border-red-200 bg-red-50">
              <p className="text-red-600">{error}</p>
            </Card>
          )}

          {results && (
            <div className="space-y-6">
              <Card className={`p-6 ${results.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <h2 className="text-xl font-semibold mb-2">
                  Overall Result: {results.success ? '✅ PASSED' : '❌ FAILED'}
                </h2>
                <p className="text-gray-600">
                  Testing as: {results.results.currentUser}
                </p>
              </Card>

              {/* Profiles Table Tests */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Profiles Table {getTableStatus(results.results.tests.profiles.passed)}
                </h3>
                <div className="space-y-2">
                  {Object.entries(results.results.tests.profiles.details).map(([test, result]) => (
                    <div key={test} className="flex items-start space-x-2">
                      <span>{getStatusIcon(result.success)}</span>
                      <div className="flex-1">
                        <p className="font-medium">
                          {test.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        {result.error && (
                          <p className="text-sm text-red-600">{result.error}</p>
                        )}
                        {result.note && (
                          <p className="text-sm text-gray-600">{result.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Subjects Table Tests */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Subjects Table {getTableStatus(results.results.tests.subjects.passed)}
                </h3>
                <div className="space-y-2">
                  {Object.entries(results.results.tests.subjects.details).map(([test, result]) => (
                    <div key={test} className="flex items-start space-x-2">
                      <span>{getStatusIcon(result.success)}</span>
                      <div className="flex-1">
                        <p className="font-medium">
                          {test.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        {result.error && (
                          <p className="text-sm text-red-600">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Study Sessions Table Tests */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Study Sessions Table {getTableStatus(results.results.tests.study_sessions.passed)}
                </h3>
                <div className="space-y-2">
                  {Object.entries(results.results.tests.study_sessions.details).map(([test, result]) => (
                    <div key={test} className="flex items-start space-x-2">
                      <span>{getStatusIcon(result.success)}</span>
                      <div className="flex-1">
                        <p className="font-medium">
                          {test.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        {result.error && (
                          <p className="text-sm text-red-600">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}