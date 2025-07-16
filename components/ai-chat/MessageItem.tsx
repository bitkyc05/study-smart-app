import { memo, useState } from 'react';
import { ChatMessage } from '@/types/ai-chat.types';
import { cn } from '@/lib/utils';
import { User, Bot, Copy, Check, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

const MessageItem = memo(function MessageItem({ 
  message, 
  isStreaming 
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        {/* 메시지 내용 */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ node, inline, className, children, ...props }) {
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

        {/* 스트리밍 인디케이터 */}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
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
          
          {message.role === 'assistant' && (
            <button
              onClick={() => {/* 재생성 로직 */}}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
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