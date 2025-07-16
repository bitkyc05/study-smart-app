'use client';

import { useEffect, useState } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import ChatLayout from '@/components/ai-chat/ChatLayout';
import ChatSidebar from '@/components/ai-chat/ChatSidebar';
import ChatMain from '@/components/ai-chat/ChatMain';
import ChatSettings from '@/components/ai-chat/ChatSettings';
import { useHotkeys } from '@/hooks/useHotkeys';

export default function AIChatPage() {
  const [showSettings, setShowSettings] = useState(false);
  const { isSidebarOpen, setSidebarOpen } = useAIChatStore();
  
  // 키보드 단축키
  useHotkeys([
    ['cmd+k', () => document.getElementById('chat-input')?.focus()],
    ['cmd+/', () => setSidebarOpen(!isSidebarOpen)],
    ['cmd+,', () => setShowSettings(!showSettings)],
    ['esc', () => setShowSettings(false)]
  ]);

  return (
    <ChatLayout>
      <div className="flex h-full">
        {/* 사이드바 - 세션 목록 */}
        <ChatSidebar 
          isOpen={isSidebarOpen}
          onToggle={() => setSidebarOpen(!isSidebarOpen)}
        />
        
        {/* 메인 채팅 영역 */}
        <ChatMain 
          onSettingsClick={() => setShowSettings(true)}
          className={isSidebarOpen ? 'lg:ml-80' : ''}
        />
        
        {/* 설정 패널 */}
        <ChatSettings 
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    </ChatLayout>
  );
}