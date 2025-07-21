import { memo, useState, useEffect } from 'react';
import { ChatMessage } from '@/types/ai-chat.types';
import { cn } from '@/lib/utils';
import { User, Bot, Copy, Check, RefreshCw, FileText, Image, Code, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { createClient } from '@/lib/supabase/client';

interface MessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}

interface FileInfo {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

const MessageItem = memo(function MessageItem({ 
  message, 
  isStreaming,
  onRegenerate 
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileInfo[]>([]);
  const supabase = createClient();

  // 파일 정보 가져오기
  useEffect(() => {
    const fileContexts = message.metadata?.fileContexts;
    if (fileContexts && fileContexts.length > 0) {
      const fetchFiles = async () => {
        const { data } = await supabase
          .from('file_contexts')
          .select('id, file_name, file_type, file_size')
          .in('id', fileContexts);
        
        if (data) {
          setAttachedFiles(data);
        }
      };
      fetchFiles();
    }
  }, [message.metadata?.fileContexts, supabase]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    if (type.includes('json') || type.includes('csv')) return Database;
    return Code;
  };

  return (
    <div className={cn(
      "group flex gap-4 p-4 rounded-lg",
      message.role === 'user' ? "bg-muted" : "bg-card"
    )}>
      {/* 아바타 */}
      <div className="flex-none">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          message.role === 'user' ? "bg-primary" : "bg-primary/20"
        )}>
          {message.role === 'user' ? (
            <User className="w-4 h-4 text-primary-foreground" />
          ) : (
            <Bot className="w-4 h-4 text-primary" />
          )}
        </div>
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        {/* 스트리밍 중이고 콘텐츠가 없을 때 애니메이션 표시 */}
        {isStreaming && !message.content ? (
          <div className="flex items-center gap-3 py-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm text-muted-foreground animate-pulse">AI가 생각하는 중...</span>
          </div>
        ) : (
          <>
            {/* 첨부 파일 표시 */}
            {attachedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachedFiles.map(file => {
                  const Icon = getFileIcon(file.file_type);
                  return (
                    <div
                      key={file.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm"
                    >
                      <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-900 dark:text-blue-100">{file.file_name}</span>
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        ({(file.file_size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 메시지 내용 */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    
                    return !inline && match ? (
                      <div className="relative group">
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          className="!mt-0"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(String(children));
                          }}
                          className="absolute top-2 right-2 p-1 bg-background/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // 테이블 스타일링
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto">
                        <table className="min-w-full">{children}</table>
                      </div>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* 스트리밍 인디케이터 (콘텐츠가 있을 때) */}
            {isStreaming && message.content && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
            )}
          </>
        )}

        {/* 액션 버튼 */}
        <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          
          {message.role === 'assistant' && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              title="다시 생성"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default MessageItem;