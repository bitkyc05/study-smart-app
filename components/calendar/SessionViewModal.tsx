'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Modal } from '@/components/ui/Modal';
import { SessionList } from './SessionList';
import { JournalEditor } from './JournalEditor';
import { getSessionsByDate, getJournalByDate, StudySession, JournalEntry } from '@/lib/actions/calendar';
import { Calendar, Loader2 } from 'lucide-react';

interface SessionViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
}

export function SessionViewModal({ isOpen, onClose, date }: SessionViewModalProps) {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && date) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, date]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [sessionsData, journalData] = await Promise.all([
        getSessionsByDate(date),
        getJournalByDate(date)
      ]);

      setSessions(sessionsData);
      setJournal(journalData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJournalUpdate = (updatedJournal: JournalEntry | null) => {
    setJournal(updatedJournal);
  };

  const formattedDate = date ? format(new Date(date), 'yyyy년 MM월 dd일 (EEE)', { locale: ko }) : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <span>{formattedDate}</span>
        </div>
      }
      className="max-h-[80vh] overflow-hidden flex flex-col"
    >
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 학습 세션 목록 */}
            <SessionList sessions={sessions} />
            
            {/* 학습 일기 */}
            <JournalEditor 
              date={date} 
              initialJournal={journal}
              onUpdate={handleJournalUpdate}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}