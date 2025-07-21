import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import MessageItem from './MessageItem';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ChatMessagesProps {
  className?: string;
}

export default function ChatMessages({ className }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  
  const { 
    activeSessionId, 
    streamingMessageId, 
    messages: allMessages,
    sessions,
    providerSettings,
    updateMessage,
    setStreamingMessageId
  } = useAIChatStore();
  const messages = useMemo(() => {
    return activeSessionId ? allMessages[activeSessionId] || [] : [];
  }, [activeSessionId, allMessages]);
  const supabase = createClient();

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

  // 메시지 재생성
  const handleRegenerate = useCallback(async (messageId: string) => {
    if (!activeSessionId || regeneratingMessageId) return;

    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    // 이전 사용자 메시지 찾기
    let userMessageIndex = -1;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMessageIndex = i;
        break;
      }
    }

    if (userMessageIndex === -1) {
      toast.error('재생성할 사용자 메시지를 찾을 수 없습니다');
      return;
    }

    const userMessage = messages[userMessageIndex];
    const currentSession = sessions.find(s => s.id === activeSessionId);
    
    if (!currentSession) return;

    // 재생성 시작
    setRegeneratingMessageId(messageId);
    updateMessage(activeSessionId, messageId, { content: '', isStreaming: true });
    setStreamingMessageId(messageId);

    try {
      // 이전 메시지들 가져오기 (재생성하는 메시지 이전까지)
      const messagesToSend = messages.slice(0, userMessageIndex + 1).map(m => ({
        role: m.role,
        content: m.content
      })).slice(-10); // 최근 10개 메시지만

      // Edge Function 호출
      const { data: { session } } = await supabase.auth.getSession();
      const provider = currentSession.provider || 'openai';
      const settings = providerSettings[provider] || {};
      const model = currentSession.model || settings.model || '';

      const response = await supabase.functions.invoke('chat', {
        body: {
          messages: messagesToSend,
          provider,
          model,
          temperature: settings?.temperature || 0.7,
          maxTokens: settings?.maxTokens || 4096,
          stream: false,
          fileContexts: userMessage.metadata?.fileContexts || []
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        // 429 에러 처리
        if (response.error.message?.includes('429') || response.error.message?.includes('Too Many Requests')) {
          throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        }
        throw response.error;
      }

      const data = response.data;
      let content = '';

      if (provider === 'anthropic') {
        content = data.content?.[0]?.text || '';
      } else if (provider === 'google') {
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        content = data.choices?.[0]?.message?.content || '';
      }

      // 메시지 업데이트
      updateMessage(activeSessionId, messageId, { 
        content, 
        isStreaming: false,
        createdAt: new Date()
      });

      // DB 업데이트
      await supabase.from('ai_chat_messages')
        .update({ 
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

    } catch (error) {
      console.error('Failed to regenerate message:', error);
      const errorMessage = error instanceof Error ? error.message : '메시지 재생성에 실패했습니다';
      toast.error(errorMessage);
      
      // 에러 시 원래 메시지로 복구
      updateMessage(activeSessionId, messageId, { 
        isStreaming: false 
      });
    } finally {
      setRegeneratingMessageId(null);
      setStreamingMessageId(null);
    }
  }, [activeSessionId, messages, sessions, providerSettings, updateMessage, setStreamingMessageId, supabase, regeneratingMessageId]);

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
            onRegenerate={
              message.role === 'assistant' 
                ? () => handleRegenerate(message.id)
                : undefined
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