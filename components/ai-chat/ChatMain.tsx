import { useAIChatStore } from '@/store/useAIChatStore';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import EmptyState from './EmptyState';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMainProps {
  onSettingsClick: () => void;
  className?: string;
}

export default function ChatMain({ onSettingsClick, className }: ChatMainProps) {
  const { activeSessionId } = useAIChatStore();

  return (
    <div className={cn("flex-1 flex flex-col", className)}>
      {/* 헤더 */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          {activeSessionId ? (
            <CurrentSessionInfo />
          ) : (
            <span className="text-muted-foreground">대화를 선택하거나 새로 시작하세요</span>
          )}
        </div>
        
        <button
          onClick={onSettingsClick}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* 메시지 영역 */}
      {activeSessionId ? (
        <>
          <ChatMessages className="flex-1" />
          <ChatInput className="flex-none" />
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

// 현재 세션 정보
function CurrentSessionInfo() {
  const { sessions, activeSessionId, providerSettings } = useAIChatStore();
  const currentSession = sessions.find(s => s.id === activeSessionId);

  if (!currentSession) return null;

  const currentProviderSettings = providerSettings[currentSession.provider];

  return (
    <div>
      <h2 className="font-medium">{currentSession.title}</h2>
      <p className="text-xs text-muted-foreground">
        {currentSession.provider} · {currentProviderSettings?.model || currentSession.model}
      </p>
    </div>
  );
}