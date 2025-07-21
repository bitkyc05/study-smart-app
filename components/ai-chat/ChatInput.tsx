import { useState, useRef, useEffect } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import { Send, Paperclip, Mic, Square, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHotkeys } from '@/hooks/useHotkeys';
import type { SpeechRecognitionEvent } from '@/types/ai-chat.types'; // ProcessedFile는 파일 첨부 기능 이후 사용 예정
import { ChatSessionService } from '@/lib/services/chat-session-service';
import { APIKeyService } from '@/lib/services/api-key-service';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ChatInputProps {
  className?: string;
}

export default function ChatInput({ className }: ChatInputProps) {
  const [message, setMessage] = useState('');
  // const [showFileUpload, setShowFileUpload] = useState(false); // 파일 첨부 기능 이후 구현 예정
  const [isRecording, setIsRecording] = useState(false);
  // const [attachedFiles, setAttachedFiles] = useState<ProcessedFile[]>([]); // 파일 첨부 기능 이후 구현 예정
  const [isSending, setIsSending] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { 
    activeSessionId, 
    streamingMessageId, 
    setStreamingMessageId,
    addMessage,
    setActiveSession,
    updateMessage,
    sessions,
    providerSettings,
    getSessionMessages
  } = useAIChatStore();

  const [userId, setUserId] = useState<string | null>(null);
  const sessionService = useRef(new ChatSessionService());
  const supabase = createClient();

  // 사용자 정보 가져오기
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, [supabase]);

  // 자동 높이 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // 단축키
  useHotkeys([
    ['cmd+enter', () => handleSend()],
    ['escape', () => {
      if (streamingMessageId) setStreamingMessageId(null);
      else setMessage('');
    }]
  ]);

  const handleSend = async () => {
    if (isSending) return; // 이미 전송 중이면 무시
    if (!message.trim()) return; // && attachedFiles.length === 0) return; // 파일 첨부 기능 이후 구현 예정
    if (streamingMessageId) return;

    // 로그인 확인
    if (!userId) {
      alert('로그인이 필요합니다.');
      return;
    }

    setIsSending(true); // 전송 시작

    let sessionId = activeSessionId;

    // 활성 세션이 없으면 새 세션 생성
    if (!sessionId) {
      try {
        // 현재 선택된 provider 찾기 (providerSettings에서 model이 설정된 provider)
        let selectedProvider = 'openai';
        let selectedModel = '';
        
        // providerSettings에서 model이 설정된 provider 찾기
        for (const [provider, settings] of Object.entries(providerSettings)) {
          if (settings?.model) {
            selectedProvider = provider;
            selectedModel = settings.model;
            break;
          }
        }
        
        // 만약 선택된 provider가 없으면 사용 가능한 첫 번째 프로바이더 사용
        if (!selectedModel) {
          const keys = await new APIKeyService(supabase).getUserKeys(userId);
          const activeProviders = keys.filter(k => k.is_active).map(k => k.provider);
          selectedProvider = activeProviders[0] || 'openai';
          selectedModel = providerSettings[selectedProvider]?.model || '';
        }
        
        console.log('[ChatInput] Creating new session with:', { 
          provider: selectedProvider, 
          model: selectedModel 
        });
        
        const newSession = await sessionService.current.createSession(userId, {
          title: message.slice(0, 50), // 첫 메시지의 일부를 제목으로 사용
          provider: selectedProvider,
          model: selectedModel,
        });
        sessionId = newSession.id;
        setActiveSession(sessionId);
      } catch (error) {
        console.error('Failed to create session:', error);
        alert('세션 생성에 실패했습니다.');
        setIsSending(false); // 세션 생성 실패 시에도 리셋
        return;
      }
    }

    // 사용자 메시지 추가
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: message,
      createdAt: new Date(),
      metadata: {
        // fileContexts: attachedFiles.map(f => f.id) // 파일 첨부 기능 이후 구현 예정
      }
    };
    
    addMessage(sessionId, userMessage);
    setMessage('');
    // setAttachedFiles([]); // 파일 첨부 기능 이후 구현 예정
    textareaRef.current?.focus();
    
    // 데이터베이스에 메시지 저장
    try {
      await supabase.from('ai_chat_messages').insert({
        session_id: sessionId,
        user_id: userId,
        role: 'user',
        content: message,
        metadata: { 
          // fileContexts: attachedFiles.map(f => f.id) // 파일 첨부 기능 이후 구현 예정
        }
      });
    } catch (error) {
      console.error('Failed to save message to database:', error);
    }

    // AI 응답 요청
    const assistantMessageId = `msg-${Date.now()}-assistant`;
    const currentSession = sessions.find(s => s.id === sessionId);
    
    console.log('[ChatInput] Finding session:', {
      sessionId,
      sessionsCount: sessions.length,
      sessionIds: sessions.map(s => s.id),
      found: !!currentSession,
      sessions: sessions // 전체 세션 데이터 확인
    });
    
    console.log('[ChatInput] Current session:', {
      id: currentSession?.id,
      provider: currentSession?.provider,
      model: currentSession?.model
    });
    
    // Get provider from session
    const provider = currentSession?.provider || 'openai';
    const settings = providerSettings[provider] || {};
    
    // Use model from session if available, otherwise from settings
    const model = currentSession?.model || settings.model || '';
    
    console.log('[ChatInput] Using provider/model:', {
      provider,
      model,
      settingsModel: settings.model,
      sessionModel: currentSession?.model
    });
    
    // AI 응답 메시지 추가 (스트리밍 준비)
    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant' as const,
      content: '',
      createdAt: new Date(),
      isStreaming: true
    };
    
    addMessage(sessionId, assistantMessage);
    setStreamingMessageId(assistantMessageId);
    
    try {
      // 대화 기록 준비
      const sessionMessages = getSessionMessages(sessionId);
      const messagesToSend = [
        ...sessionMessages.filter(m => m.role !== 'assistant' || m.content !== '').map(m => ({
          role: m.role,
          content: m.content
        })),
        { role: 'user' as const, content: message }
      ].slice(-10); // 최근 10개 메시지만 전송
      
      // Edge Function 호출
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('Invoking chat function with:', {
        provider,
        model: model,
        hasToken: !!session?.access_token,
        messageCount: messagesToSend.length
      });
      
      const response = await supabase.functions.invoke('chat', {
        body: {
          messages: messagesToSend,
          provider,
          model: model,  // Use the model variable we determined above
          temperature: settings?.temperature || 0.7,
          maxTokens: settings?.maxTokens || 4096,
          stream: false
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });
      
      console.log('Chat function response:', {
        error: response.error,
        status: response.error?.status,
        data: response.data
      });
      
      if (response.error) {
        throw response.error;
      }
      
      // 응답 처리
      const responseData = response.data;
      let accumulatedContent = '';
      
      // OpenAI 형식의 응답 처리
      if (responseData && responseData.choices && responseData.choices[0]) {
        const choice = responseData.choices[0];
        if (choice.message && choice.message.content) {
          accumulatedContent = choice.message.content;
        } else if (choice.text) {
          accumulatedContent = choice.text;
        }
      } 
      // Anthropic 형식의 응답 처리
      else if (responseData && responseData.content) {
        if (Array.isArray(responseData.content)) {
          accumulatedContent = responseData.content
            .filter((c: { type?: string }) => c.type === 'text')
            .map((c: { text?: string }) => c.text || '')
            .join('');
        } else {
          accumulatedContent = responseData.content;
        }
      }
      // Google Gemini 형식의 응답 처리
      else if (responseData && responseData.candidates && responseData.candidates[0]) {
        const candidate = responseData.candidates[0];
        if (candidate.content && candidate.content.parts) {
          accumulatedContent = candidate.content.parts
            .map((part: { text?: string }) => part.text || '')
            .join('');
        }
      }
      // 기타 형식
      else if (responseData && responseData.message) {
        accumulatedContent = responseData.message;
      } else if (typeof responseData === 'string') {
        accumulatedContent = responseData;
      } else {
        console.error('Unexpected response format:', responseData);
        throw new Error('Invalid response format');
      }
      
      updateMessage(sessionId, assistantMessageId, {
        content: accumulatedContent
      });
      
      // 스트리밍 완료
      updateMessage(sessionId, assistantMessageId, {
        isStreaming: false
      });
      setStreamingMessageId(null);
      
      // AI 응답 데이터베이스에 저장
      try {
        await supabase.from('ai_chat_messages').insert({
          session_id: sessionId,
          user_id: userId,
          role: 'assistant',
          content: accumulatedContent
        });
      } catch (error) {
        console.error('Failed to save AI response to database:', error);
      }
      
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      let errorMessage = '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.';
      
      const errorMsg = error instanceof Error ? error.message : '';
      if (errorMsg.includes('non-2xx status code')) {
        errorMessage = 'API 키가 설정되지 않았거나 유효하지 않습니다. 설정에서 API 키를 확인해주세요.';
      } else if (errorMsg.includes('Invalid token')) {
        errorMessage = '인증이 만료되었습니다. 다시 로그인해주세요.';
      } else if (errorMsg) {
        errorMessage = `오류: ${errorMsg}`;
      }
      
      updateMessage(sessionId, assistantMessageId, {
        content: errorMessage,
        isStreaming: false
      });
      setStreamingMessageId(null);
    } finally {
      setIsSending(false); // 전송 완료
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isSending) {
      e.preventDefault();
      handleSend();
    }
  };

  // File handling functions will be implemented when FileUpload component is ready

  // 파일 첨부 기능 이후 구현 예정
  // const removeFile = (index: number) => {
  //   setAttachedFiles(files => files.filter((_, i) => i !== index));
  // };

  // 음성 녹음 (Web Speech API)
  const toggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('음성 인식이 지원되지 않는 브라우저입니다.');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      
      setMessage(transcript);
    };

    recognition.start();
    setIsRecording(true);
    
    // 저장해서 나중에 중지
    window.currentRecognition = recognition;
  };

  const stopRecording = () => {
    const recognition = window.currentRecognition;
    if (recognition) {
      recognition.stop();
      delete window.currentRecognition;
    }
    setIsRecording(false);
  };

  return (
    <div className={cn("border-t bg-card", className)}>
      {/* 첨부파일 표시 - 파일 첨부 기능 이후 구현 예정 */}
      {/* {attachedFiles.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm"
            >
              <span className="max-w-[200px] truncate">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )} */}

      {/* 입력 영역 */}
      <div className="p-4">
        <div className="relative flex items-end gap-2">
          {/* 텍스트 입력 */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              id="chat-input"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={streamingMessageId ? "AI가 응답 중..." : isSending ? "메시지 전송 중..." : "메시지를 입력하세요..."}
              disabled={!!streamingMessageId || isSending}
              className={cn(
                "w-full px-4 py-3 pr-12 bg-muted rounded-lg resize-none outline-none",
                "focus:ring-2 focus:ring-primary transition-all",
                "min-h-[52px] max-h-[200px]",
                streamingMessageId && "opacity-50 cursor-not-allowed"
              )}
              rows={1}
            />
            
            {/* AI 제안 버튼 */}
            <button
              className="absolute right-2 bottom-2 p-2 hover:bg-background rounded-lg transition-colors"
              title="AI 제안"
            >
              <Sparkles className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-1">
            {/* 파일 첨부 */}
            <button
              onClick={() => {
                // 임시로 "이후 구현 예정" 메시지 표시
                toast.info('파일 첨부 기능은 이후 구현 예정입니다.');
                
                // 원래 코드 (주석 처리)
                // setShowFileUpload(!showFileUpload)
              }}
              className="p-3 hover:bg-muted rounded-lg transition-colors"
              title="파일 첨부 (이후 구현 예정)"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* 음성 입력 */}
            <button
              onClick={toggleRecording}
              className={cn(
                "p-3 hover:bg-muted rounded-lg transition-colors",
                isRecording && "bg-red-500 text-white hover:bg-red-600"
              )}
              title={isRecording ? "녹음 중지" : "음성 입력"}
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* 전송/중지 버튼 */}
            {streamingMessageId ? (
              <button
                onClick={() => setStreamingMessageId(null)}
                className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                title="중지"
              >
                <Square className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!message.trim() || isSending} // && attachedFiles.length === 0) || isSending} // 파일 첨부 기능 이후 구현 예정
                className={cn(
                  "p-3 rounded-lg transition-colors",
                  message.trim() && !isSending // || attachedFiles.length > 0) && !isSending // 파일 첨부 기능 이후 구현 예정
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                title="전송 (⌘Enter)"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* 파일 업로드 팝업 - 이후 구현 예정 */}
        {/* {showFileUpload && (
          <div className="absolute bottom-full left-0 right-0 mb-2 p-4 bg-card border rounded-lg shadow-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">파일 업로드 기능은 곧 구현될 예정입니다.</p>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}