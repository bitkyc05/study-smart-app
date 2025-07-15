'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Plus, Edit2, Trash2, Save, X, BookOpen } from 'lucide-react'

interface Subject {
  id: number
  name: string
  color_hex: string | null
}

const predefinedColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#F43F5E', // rose
]

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newSubject, setNewSubject] = useState({ name: '', color_hex: predefinedColors[0] })
  const [editSubject, setEditSubject] = useState({ name: '', color_hex: '' })

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('name')

    if (!error && data) {
      setSubjects(data)
    }
    setIsLoading(false)
  }

  const addSubject = async () => {
    if (!newSubject.name.trim()) return

    const response = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSubject)
    })

    if (response.ok) {
      const subject = await response.json()
      setSubjects([...subjects, subject])
      setNewSubject({ name: '', color_hex: predefinedColors[0] })
      setIsAdding(false)
    }
  }

  const updateSubject = async (id: number) => {
    if (!editSubject.name.trim()) return

    const response = await fetch(`/api/subjects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editSubject)
    })

    if (response.ok) {
      const updatedSubject = await response.json()
      setSubjects(subjects.map(s => s.id === id ? updatedSubject : s))
      setEditingId(null)
      setEditSubject({ name: '', color_hex: '' })
    }
  }

  const deleteSubject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      return
    }

    const response = await fetch(`/api/subjects/${id}`, {
      method: 'DELETE'
    })

    if (response.ok) {
      setSubjects(subjects.filter(s => s.id !== id))
    }
  }

  const startEditing = (subject: Subject) => {
    setEditingId(subject.id)
    setEditSubject({ name: subject.name, color_hex: subject.color_hex || predefinedColors[0] })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditSubject({ name: '', color_hex: '' })
  }

  const cancelAdding = () => {
    setIsAdding(false)
    setNewSubject({ name: '', color_hex: predefinedColors[0] })
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Subject Management</h1>
        <p className="text-gray-600 mt-2">Add, edit, and organize your study subjects</p>
      </div>

      {/* Add Subject Section */}
      <Card className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Add New Subject</h2>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Subject
            </Button>
          )}
        </div>

        {isAdding && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name</label>
              <Input
                value={newSubject.name}
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                placeholder="Enter subject name"
                className="max-w-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewSubject({ ...newSubject, color_hex: color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newSubject.color_hex === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={addSubject} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save
              </Button>
              <Button onClick={cancelAdding} variant="secondary" className="flex items-center gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Subjects List */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Your Subjects</h2>
        
        {subjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No subjects added yet.</p>
            <p className="text-sm">Click &quot;Add Subject&quot; to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subjects.map(subject => (
              <div key={subject.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                {editingId === subject.id ? (
                  <div className="flex-1 flex items-center gap-4">
                    <Input
                      value={editSubject.name}
                      onChange={(e) => setEditSubject({ ...editSubject, name: e.target.value })}
                      className="max-w-xs"
                    />
                    <div className="flex gap-2">
                      {predefinedColors.map(color => (
                        <button
                          key={color}
                          onClick={() => setEditSubject({ ...editSubject, color_hex: color })}
                          className={`w-6 h-6 rounded-full border-2 ${
                            editSubject.color_hex === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-4">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: subject.color_hex || '#5D737E' }}
                    />
                    <span className="font-medium">{subject.name}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  {editingId === subject.id ? (
                    <>
                      <Button
                        onClick={() => updateSubject(subject.id)}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </Button>
                      <Button
                        onClick={cancelEditing}
                        size="sm"
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => startEditing(subject)}
                        size="sm"
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </Button>
                      {subject.name !== 'Etc' && (
                        <Button
                          onClick={() => deleteSubject(subject.id)}
                          size="sm"
                          variant="ghost"
                          className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}