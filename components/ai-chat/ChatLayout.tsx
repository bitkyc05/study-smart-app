import { ReactNode } from 'react';

interface ChatLayoutProps {
  children: ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 헤더 */}
      <header className="flex-none border-b bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-semibold">AI 학습 도우미</h1>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 text-xs bg-muted rounded">⌘K</kbd>
            <span className="text-xs text-muted-foreground">빠른 검색</span>
          </div>
        </div>
      </header>
      
      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}