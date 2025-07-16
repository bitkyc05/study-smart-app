import { ReactNode } from 'react';

interface ChatLayoutProps {
  children: ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}