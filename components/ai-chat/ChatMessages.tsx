import { useEffect, useRef, useState } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import MessageItem from './MessageItem';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ChatMessagesProps {
  className?: string;
}

export default function ChatMessages({ className }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const { activeSessionId, getSessionMessages, streamingMessageId } = useAIChatStore();
  const messages = activeSessionId ? getSessionMessages(activeSessionId) : [];

  // 가상 스크롤링 (성능 최적화)
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 100,
    overscan: 5
  });

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
        {/* 가상 렌더링 */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualizer.getVirtualItems().map(virtualItem => {
            const message = messages[virtualItem.index];
            
            return (
              <div
                key={message.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`
                }}
              >
                <MessageItem 
                  message={message}
                  isStreaming={
                    streamingMessageId === message.id &&
                    message.role === 'assistant'
                  }
                />
              </div>
            );
          })}
        </div>
        
        {/* 로딩 인디케이터 */}
        {streamingMessageId && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">AI가 생각하고 있습니다...</span>
          </div>
        )}
      </div>
    </div>
  );
}