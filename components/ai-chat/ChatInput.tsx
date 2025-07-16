import { useState, useRef, useEffect } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import { Send, Paperclip, Mic, Square, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHotkeys } from '@/hooks/useHotkeys';
import type { ProcessedFile } from '@/types/ai-chat.types';

interface ChatInputProps {
  className?: string;
}

export default function ChatInput({ className }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<ProcessedFile[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { 
    activeSessionId, 
    streamingMessageId, 
    setStreamingMessageId,
    addMessage
  } = useAIChatStore();

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
    if (!message.trim() && attachedFiles.length === 0) return;
    if (streamingMessageId || !activeSessionId) return;

    // 사용자 메시지 추가
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: message,
      createdAt: new Date(),
      metadata: {
        fileContexts: attachedFiles.map(f => f.id)
      }
    };
    
    addMessage(activeSessionId, userMessage);
    setMessage('');
    setAttachedFiles([]);
    textareaRef.current?.focus();

    // TODO: AI 응답 요청 로직 구현
    // 여기서 Edge Function을 호출하여 AI 응답을 받아야 함
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (files: ProcessedFile[]) => {
    setAttachedFiles([...attachedFiles, ...files]);
    setShowFileUpload(false);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(files => files.filter((_, i) => i !== index));
  };

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

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      
      setMessage(transcript);
    };

    recognition.start();
    setIsRecording(true);
    
    // 저장해서 나중에 중지
    (window as any).currentRecognition = recognition;
  };

  const stopRecording = () => {
    const recognition = (window as any).currentRecognition;
    if (recognition) {
      recognition.stop();
      delete (window as any).currentRecognition;
    }
    setIsRecording(false);
  };

  return (
    <div className={cn("border-t bg-card", className)}>
      {/* 첨부파일 표시 */}
      {attachedFiles.length > 0 && (
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
      )}

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
              placeholder={streamingMessageId ? "AI가 응답 중..." : "메시지를 입력하세요..."}
              disabled={!!streamingMessageId}
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
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="p-3 hover:bg-muted rounded-lg transition-colors"
              title="파일 첨부"
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
                disabled={!message.trim() && attachedFiles.length === 0}
                className={cn(
                  "p-3 rounded-lg transition-colors",
                  message.trim() || attachedFiles.length > 0
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

        {/* 파일 업로드 팝업 */}
        {showFileUpload && (
          <div className="absolute bottom-full left-0 right-0 mb-2 p-4 bg-card border rounded-lg shadow-lg">
            {/* FileUpload 컴포넌트가 이미 있으므로 사용 */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">파일 업로드 기능은 곧 구현될 예정입니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}