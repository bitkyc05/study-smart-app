import { useState, useMemo } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Trash2, 
  Edit2,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
// Date formatting utilities will be added when needed

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatSidebar({ isOpen, onToggle }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const { 
    sessions, 
    activeSessionId, 
    setActiveSession, 
    addSession,
    updateSession,
    deleteSession,
    getSessionMessages 
  } = useAIChatStore();

  // 세션 필터링 및 정렬
  const filteredSessions = useMemo(() => {
    const filtered = sessions.filter(session => {
      const messages = getSessionMessages(session.id);
      return session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        messages.some(msg => 
          msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });
    
    return filtered.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [sessions, searchQuery, getSessionMessages]);

  // 날짜별 그룹화
  const groupedSessions = useMemo(() => {
    const groups: Record<string, typeof sessions> = {
      today: [],
      yesterday: [],
      week: [],
      month: [],
      older: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    filteredSessions.forEach(session => {
      const sessionDate = new Date(session.updatedAt);
      
      if (sessionDate >= today) {
        groups.today.push(session);
      } else if (sessionDate >= yesterday) {
        groups.yesterday.push(session);
      } else if (sessionDate >= weekAgo) {
        groups.week.push(session);
      } else if (sessionDate >= monthAgo) {
        groups.month.push(session);
      } else {
        groups.older.push(session);
      }
    });

    return groups;
  }, [filteredSessions]);

  const handleCreateSession = () => {
    const newSession = {
      id: `session-${Date.now()}`,
      userId: 'current-user', // TODO: Get from auth
      title: '새 대화',
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      isArchived: false
    };
    
    addSession(newSession);
    setActiveSession(newSession.id);
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
    updateSession(sessionId, { title: newTitle });
    setEditingId(null);
  };

  const renderSessionGroup = (title: string, sessions: typeof filteredSessions) => {
    if (sessions.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="px-3 mb-2 text-xs font-medium text-muted-foreground">
          {title}
        </h3>
        <div className="space-y-1">
          {sessions.map(session => (
            <div
              key={session.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-body-md font-medium",
                activeSessionId === session.id
                  ? "bg-accent-light text-accent-focus border-l-2 border-accent-focus ml-[-2px]"
                  : "text-text-secondary hover:bg-accent-light hover:text-text-primary"
              )}
              onClick={() => setActiveSession(session.id)}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              
              {editingId === session.id ? (
                <input
                  type="text"
                  defaultValue={session.title}
                  className="flex-1 bg-transparent outline-none"
                  autoFocus
                  onClick={e => e.stopPropagation()}
                  onBlur={e => handleRenameSession(session.id, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleRenameSession(session.id, e.currentTarget.value);
                    } else if (e.key === 'Escape') {
                      setEditingId(null);
                    }
                  }}
                />
              ) : (
                <span className="flex-1 truncate">{session.title}</span>
              )}
              
              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setEditingId(session.id);
                  }}
                  className="p-1 hover:bg-background/20 rounded"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (confirm('이 대화를 삭제하시겠습니까?')) {
                      deleteSession(session.id);
                    }
                  }}
                  className="p-1 hover:bg-background/20 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-accent/20 border-l-2 border-accent transition-all duration-300 overflow-hidden shadow-md",
        isOpen ? "w-80" : "w-16"
      )}
    >
      {isOpen ? (
        <>
          {/* 헤더 */}
          <div className="flex-none p-4 border-b border-accent bg-background/50">
            <button
              onClick={handleCreateSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-focus transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>새 대화 시작</span>
            </button>
          </div>

          {/* 검색 */}
          <div className="flex-none p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="대화 검색..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* 세션 목록 */}
          <div className="flex-1 overflow-y-auto px-2">
            {renderSessionGroup('오늘', groupedSessions.today)}
            {renderSessionGroup('어제', groupedSessions.yesterday)}
            {renderSessionGroup('이번 주', groupedSessions.week)}
            {renderSessionGroup('이번 달', groupedSessions.month)}
            {renderSessionGroup('이전', groupedSessions.older)}
            
            {filteredSessions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">대화가 없습니다</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center py-4 space-y-4">
          <button
            onClick={onToggle}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="사이드바 열기"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={handleCreateSession}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="새 대화 시작"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      )}
    </aside>
  );
}