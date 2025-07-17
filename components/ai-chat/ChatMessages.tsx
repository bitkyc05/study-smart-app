import { useEffect, useRef, useState } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import MessageItem from './MessageItem';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ChatMessagesProps {
  className?: string;
}

export default function ChatMessages({ className }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const { activeSessionId, streamingMessageId, messages: allMessages } = useAIChatStore();
  const messages = activeSessionId ? allMessages[activeSessionId] || [] : [];

  // 자동 스크롤
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // 스크롤 이벤트 처리
  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setAutoScroll(isAtBottom);
  };

  return (
    <div 
      ref={scrollRef}
      className={cn(
        "overflow-y-auto scroll-smooth",
        className
      )}
      onScroll={handleScroll}
    >
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* 메시지 렌더링 */}
        {messages.map(message => (
          <MessageItem 
            key={message.id}
            message={message}
            isStreaming={
              streamingMessageId === message.id &&
              message.role === 'assistant'
            }
          />
        ))}
        
        {/* 로딩 인디케이터 */}
        {streamingMessageId && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">AI가 생각하고 있습니다...</span>
          </div>
        )}
        
        {/* 메시지가 없을 때 */}
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p>대화를 시작해보세요!</p>
          </div>
        )}
      </div>
    </div>
  );
}