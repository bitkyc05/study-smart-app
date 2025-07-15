'use client';

import { useState } from 'react';
import { createOrUpdateJournal, deleteJournal, JournalEntry } from '@/lib/actions/calendar';
import { PenLine, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface JournalEditorProps {
  date: string;
  initialJournal: JournalEntry | null;
  onUpdate?: (journal: JournalEntry | null) => void;
}

export function JournalEditor({ date, initialJournal, onUpdate }: JournalEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialJournal?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!content.trim()) {
      setError('일기 내용을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedJournal = await createOrUpdateJournal(date, content);
      setIsEditing(false);
      onUpdate?.(updatedJournal);
    } catch (err) {
      setError('일기 저장에 실패했습니다.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 이 일기를 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteJournal(date);
      setContent('');
      setIsEditing(false);
      onUpdate?.(null);
    } catch (err) {
      setError('일기 삭제에 실패했습니다.');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setContent(initialJournal?.content || '');
    setIsEditing(false);
    setError(null);
  };

  if (!isEditing && !content && !initialJournal) {
    return (
      <div className="border-t pt-4">
        <button
          onClick={() => setIsEditing(true)}
          className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <PenLine className="w-6 h-6" />
          <span className="text-sm">오늘의 일기를 작성해보세요</span>
        </button>
      </div>
    );
  }

  return (
    <div className="border-t pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          학습 일기
        </h4>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            수정
          </button>
        )}
      </div>

      {isEditing ? (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="오늘의 학습은 어떠셨나요?"
            className="w-full min-h-[120px] p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
            autoFocus
          />
          
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="flex-1"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  저장
                </span>
              )}
            </Button>
            
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isSaving || isDeleting}
            >
              <X className="w-4 h-4" />
              취소
            </Button>

            {initialJournal && (
              <Button
                onClick={handleDelete}
                variant="outline"
                disabled={isSaving || isDeleting}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                {isDeleting ? (
                  <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {content || initialJournal?.content}
          </p>
          {initialJournal?.updated_at && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              마지막 수정: {new Date(initialJournal.updated_at).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}