'use client';

import { useState, useEffect } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import ChatLayout from '@/components/ai-chat/ChatLayout';
import SessionManager from '@/components/ai-chat/SessionManager';
import ChatMain from '@/components/ai-chat/ChatMain';
import ChatSettings from '@/components/ai-chat/ChatSettings';
import { useHotkeys } from '@/hooks/useHotkeys';
import { createClient } from '@/lib/supabase/client';

export default function AIChatPage() {
  const [showSettings, setShowSettings] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { isSidebarOpen, setSidebarOpen, setActiveSession } = useAIChatStore();
  const supabase = createClient();
  
  // 사용자 ID 가져오기
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, [supabase]);
  
  // 키보드 단축키
  useHotkeys([
    ['cmd+k', () => document.getElementById('chat-input')?.focus()],
    ['cmd+/', () => setSidebarOpen(!isSidebarOpen)],
    ['cmd+,', () => setShowSettings(!showSettings)],
    ['esc', () => setShowSettings(false)]
  ]);

  return (
    <div className="h-[calc(100vh-theme(spacing.24))]">
      <ChatLayout>
        <div className="flex h-full relative">
          {/* 메인 채팅 영역 */}
          <div className="flex-1 flex">
            <ChatMain 
              onSettingsClick={() => setShowSettings(true)}
            />
          </div>
          
          {/* 사이드바 - 세션 관리 (오른쪽) */}
          {userId && (
            <SessionManager
              userId={userId}
              mode="sidebar"
              isOpen={isSidebarOpen}
              onSessionSelect={(sessionId) => {
                setActiveSession(sessionId);
              }}
            />
          )}
          
          {/* 토글 버튼 */}
          {isSidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-80 top-20 -translate-x-3 bg-background border border-accent rounded-full p-1 shadow-sm hover:bg-accent-light transition-colors z-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          
          {/* 설정 패널 */}
          <ChatSettings 
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          />
        </div>
      </ChatLayout>
    </div>
  );
}