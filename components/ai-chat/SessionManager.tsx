'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatSessionService } from '@/lib/services/chat-session-service';
import { 
  ChatSessionWithRelations,
  SessionFilter,
  ChatTag,
  ChatFolder
} from '@/types/chat-session.types';
import { 
  Search, 
  Folder, 
  Star, 
  Archive,
  Trash2,
  Download,
  Upload,
  MoreVertical,
  MessageSquare,
  Zap,
  Plus,
  FolderOpen,
  X,
  ChevronRight,
  ChevronDown,
  FileJson,
  FileText,
  FileImage,
  Loader2,
  Sparkles,
  GripVertical
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAIChatStore } from '@/store/useAIChatStore';

interface SessionManagerProps {
  userId: string;
  onSessionSelect?: (sessionId: string) => void;
  onClose?: () => void;
  mode?: 'sidebar' | 'modal';
  isOpen?: boolean;
}

export default function SessionManager({ 
  userId, 
  onSessionSelect,
  onClose,
  mode = 'modal',
  isOpen = true
}: SessionManagerProps) {
  const [sessions, setSessions] = useState<ChatSessionWithRelations[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [tags, setTags] = useState<ChatTag[]>([]);
  const [filter, setFilter] = useState<SessionFilter>({});
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [selectedFolder] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [draggedSession, setDraggedSession] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  
  const sessionService = useMemo(() => new ChatSessionService(), []);
  const { activeSessionId, setActiveSession, sessions: storeSessions, addSession } = useAIChatStore();

  const loadSessions = useCallback(async () => {
    if (!userId) {
      console.log('No userId available, skipping session load');
      return;
    }
    
    setLoading(true);
    try {
      const result = await sessionService.searchSessions(userId, filter, {
        page,
        limit: 20,
        sortBy: 'updated',
        sortOrder: 'desc'
      });
      
      if (page === 1) {
        setSessions(result.sessions);
        // Zustand store에도 세션 추가
        result.sessions.forEach(session => {
          if (!storeSessions.find(s => s.id === session.id)) {
            addSession({
              id: session.id,
              userId: session.user_id,
              title: session.title,
              provider: session.provider,
              model: session.model,
              createdAt: new Date(session.created_at),
              updatedAt: new Date(session.updated_at),
              lastMessageAt: session.last_message_at ? new Date(session.last_message_at) : undefined,
              messageCount: session.message_count || 0,
              isArchived: session.is_archived,
              providerSettings: session.provider_settings
            });
          }
        });
      } else {
        setSessions(prev => [...prev, ...result.sessions]);
      }
      
      setHasMore(result.hasMore);
    } catch (error: unknown) {
      console.error('Failed to load sessions:', error instanceof Error ? error.message : error);
      // Show empty state instead of error
      setSessions([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [userId, filter, page, sessionService, storeSessions, addSession]);

  const loadFolders = useCallback(async () => {
    if (!userId) return;
    
    try {
      const folderList = await sessionService.getFolders(userId);
      setFolders(folderList);
    } catch (error) {
      console.error('Failed to load folders:', error);
      setFolders([]);
    }
  }, [userId, sessionService]);

  const loadTags = useCallback(async () => {
    if (!userId) return;
    
    try {
      const tagList = await sessionService.getTags(userId);
      setTags(tagList);
    } catch (error) {
      console.error('Failed to load tags:', error);
      setTags([]);
    }
  }, [userId, sessionService]);

  // 세션 로드
  useEffect(() => {
    if (userId) {
      loadSessions();
    }
  }, [userId, filter, page, loadSessions]);

  // 초기 데이터 로드
  useEffect(() => {
    if (userId) {
      loadFolders();
      loadTags();
    }
  }, [userId, loadFolders, loadTags]);

  // 새 세션 생성
  const handleCreateSession = async () => {
    if (!newSessionTitle.trim()) return;
    
    if (!userId) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const newSession = await sessionService.createSession(userId, {
        title: newSessionTitle,
        folderId: selectedFolder || undefined
      });
      
      setNewSessionTitle('');
      setShowNewSessionDialog(false);
      
      // 새 세션으로 전환
      if (onSessionSelect) {
        onSessionSelect(newSession.id);
      }
      
      // 목록 새로고침
      setPage(1);
      await loadSessions();
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('세션 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 세션 삭제
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('정말로 이 세션을 삭제하시겠습니까?')) return;

    try {
      await sessionService.deleteSession(sessionId);
      await loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  // 세션 아카이브
  const handleArchiveSession = async (sessionId: string, isArchived: boolean) => {
    try {
      await sessionService.updateSession(sessionId, { isArchived: !isArchived });
      await loadSessions();
    } catch (error) {
      console.error('Failed to archive session:', error);
    }
  };

  // 즐겨찾기 토글
  const handleToggleFavorite = async (sessionId: string) => {
    try {
      await sessionService.toggleFavorite(userId, sessionId);
      await loadSessions();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // 검색 핸들러
  const handleSearch = useCallback((value: string) => {
    setFilter(prev => ({ ...prev, search: value }));
    setPage(1);
  }, []);

  // 내보내기 핸들러
  const handleExport = async (sessionId: string, format: 'json' | 'markdown' | 'pdf') => {
    setExportLoading(true);
    try {
      const blob = await sessionService.exportSession(sessionId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const session = sessions.find(s => s.id === sessionId);
      const filename = `chat-session-${session?.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.${format}`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export session:', error);
      alert('세션 내보내기에 실패했습니다.');
    } finally {
      setExportLoading(false);
      setShowExportMenu(false);
    }
  };

  // 일괄 내보내기 핸들러
  const handleBulkExport = async (format: 'json' | 'markdown' | 'pdf') => {
    if (selectedSessions.size === 0) {
      alert('내보낼 세션을 선택해주세요.');
      return;
    }

    setExportLoading(true);
    try {
      const exportPromises = Array.from(selectedSessions).map(sessionId => 
        sessionService.exportSession(sessionId, format)
      );
      const blobs = await Promise.all(exportPromises);
      
      // ZIP 파일로 묶어서 다운로드 (추후 구현)
      // 현재는 개별 파일로 다운로드
      blobs.forEach((blob, index) => {
        const sessionId = Array.from(selectedSessions)[index];
        const session = sessions.find(s => s.id === sessionId);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `chat-session-${session?.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.${format}`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Failed to export sessions:', error);
      alert('세션 내보내기에 실패했습니다.');
    } finally {
      setExportLoading(false);
      setShowExportMenu(false);
    }
  };

  // 가져오기 핸들러
  const handleImport = async () => {
    if (!importFile) {
      alert('파일을 선택해주세요.');
      return;
    }

    setImportLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          
          // 세션 가져오기
          const newSessionId = await sessionService.importSession(userId, data);
          
          // 목록 새로고침
          setPage(1);
          await loadSessions();
          
          // 새 세션으로 전환
          if (onSessionSelect) {
            onSessionSelect(newSessionId);
          }
          
          setShowImportDialog(false);
          setImportFile(null);
          alert('세션을 성공적으로 가져왔습니다.');
        } catch (error) {
          console.error('Failed to parse import file:', error);
          alert('파일 형식이 올바르지 않습니다.');
        }
      };
      reader.readAsText(importFile);
    } catch (error) {
      console.error('Failed to import session:', error);
      alert('세션 가져오기에 실패했습니다.');
    } finally {
      setImportLoading(false);
    }
  };

  // 세션 선택 토글
  const toggleSessionSelection = (sessionId: string) => {
    const newSelection = new Set(selectedSessions);
    if (newSelection.has(sessionId)) {
      newSelection.delete(sessionId);
    } else {
      newSelection.add(sessionId);
    }
    setSelectedSessions(newSelection);
  };

  // AI 요약 생성
  const handleGenerateSummary = async (sessionId: string) => {
    try {
      // AI 요약을 생성하는 서비스 메서드 호출 
      await sessionService.generateSummary(sessionId);
      
      // 세션 목록 새로고침
      await loadSessions();
      
      alert('요약이 성공적으로 생성되었습니다.');
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert('요약 생성에 실패했습니다.');
    }
  };

  // 일괄 AI 요약 생성
  const handleBulkGenerateSummaries = async () => {
    if (selectedSessions.size === 0) {
      alert('요약을 생성할 세션을 선택해주세요.');
      return;
    }

    const confirmed = confirm(`${selectedSessions.size}개 세션의 요약을 생성하시겠습니까?`);
    if (!confirmed) return;

    try {
      const summaryPromises = Array.from(selectedSessions).map(sessionId =>
        sessionService.generateSummary(sessionId)
      );
      
      await Promise.all(summaryPromises);
      
      // 세션 목록 새로고침
      await loadSessions();
      
      alert(`${selectedSessions.size}개 세션의 요약이 생성되었습니다.`);
      setSelectedSessions(new Set());
    } catch (error) {
      console.error('Failed to generate summaries:', error);
      alert('일부 요약 생성에 실패했습니다.');
    }
  };

  // 필터 패널
  const FilterPanel = () => (
    <div className="p-4 bg-card border rounded-lg space-y-4">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="세션 검색..."
          className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg outline-none focus:ring-2 focus:ring-primary"
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* 폴더 필터 */}
      <div>
        <h4 className="text-sm font-medium mb-2">폴더</h4>
        <div className="space-y-1">
          <button
            onClick={() => {
              setFilter(prev => ({ ...prev, folderId: null }));
              setPage(1);
            }}
            className={`w-full text-left px-3 py-2 rounded hover:bg-muted ${
              filter.folderId === null ? 'bg-muted' : ''
            } ${dragOverFolder === 'root' ? 'bg-primary/20 ring-2 ring-primary' : ''}`}
            onDragOver={(e) => {
              if (draggedSession) {
                e.preventDefault();
                setDragOverFolder('root');
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (dragOverFolder === 'root') {
                setDragOverFolder(null);
              }
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              if (!draggedSession) return;
              
              try {
                await sessionService.updateSession(draggedSession, { folderId: null });
                await loadSessions();
                setDraggedSession(null);
                setDragOverFolder(null);
                // 성공 메시지
                const session = sessions.find(s => s.id === draggedSession);
                if (session) {
                  console.log(`"${session.title}" 세션이 루트 폴더로 이동되었습니다.`);
                }
              } catch (error) {
                console.error('Failed to move session to root:', error);
                alert('세션 이동에 실패했습니다.');
              }
            }}
          >
            <FolderOpen className="inline w-4 h-4 mr-2" />
            전체
          </button>
          {folders.map(folder => (
            <FolderItem
              key={folder.id}
              folder={folder}
              level={0}
              selectedId={filter.folderId}
              onSelect={(folderId) => {
                setFilter(prev => ({ ...prev, folderId }));
                setPage(1);
              }}
            />
          ))}
        </div>
      </div>

      {/* 태그 필터 */}
      <div>
        <h4 className="text-sm font-medium mb-2">태그</h4>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => {
                const newTags = filter.tags?.includes(tag.id)
                  ? filter.tags.filter(t => t !== tag.id)
                  : [...(filter.tags || []), tag.id];
                setFilter(prev => ({ ...prev, tags: newTags }));
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filter.tags?.includes(tag.id)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
              style={{
                backgroundColor: filter.tags?.includes(tag.id) ? (tag.color || undefined) : undefined
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* 빠른 필터 */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setFilter(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
            setPage(1);
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            filter.isFavorite
              ? 'bg-yellow-500/20 text-yellow-600'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <Star className="w-4 h-4" />
          <span className="text-sm">즐겨찾기</span>
        </button>
        
        <button
          onClick={() => {
            setFilter(prev => ({ ...prev, isArchived: !prev.isArchived }));
            setPage(1);
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            filter.isArchived
              ? 'bg-gray-500/20 text-gray-600'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span className="text-sm">보관함</span>
        </button>
      </div>
    </div>
  );

  // 폴더 아이템 컴포넌트
  const FolderItem = ({ 
    folder, 
    level, 
    selectedId, 
    onSelect 
  }: { 
    folder: ChatFolder; 
    level: number; 
    selectedId: string | null | undefined; 
    onSelect: (folderId: string) => void;
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = folder.children && folder.children.length > 0;

    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!draggedSession) return;
      
      try {
        await sessionService.updateSession(draggedSession, { folderId: folder.id });
        await loadSessions();
        setDraggedSession(null);
        setDragOverFolder(null);
        // 성공 메시지 (실제로는 toast 라이브러리 사용하면 좋음)
        const session = sessions.find(s => s.id === draggedSession);
        if (session) {
          console.log(`"${session.title}" 세션이 "${folder.name}" 폴더로 이동되었습니다.`);
        }
      } catch (error) {
        console.error('Failed to move session to folder:', error);
        alert('세션 이동에 실패했습니다.');
      }
    };

    return (
      <div>
        <button
          onClick={() => onSelect(folder.id)}
          className={`w-full text-left px-3 py-2 rounded hover:bg-muted flex items-center ${
            selectedId === folder.id ? 'bg-muted' : ''
          } ${dragOverFolder === folder.id ? 'bg-primary/20 ring-2 ring-primary' : ''}`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onDragOver={(e) => {
            if (draggedSession) {
              e.preventDefault();
              setDragOverFolder(folder.id);
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (dragOverFolder === folder.id) {
              setDragOverFolder(null);
            }
          }}
          onDrop={handleDrop}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="mr-1"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          <Folder className="w-4 h-4 mr-2" style={{ color: folder.color || undefined }} />
          {folder.name}
        </button>
        {isExpanded && hasChildren && (
          <div>
            {folder.children?.map((child: ChatFolder) => (
              <FolderItem
                key={child.id}
                folder={child}
                level={level + 1}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // 세션 행 컴포넌트
  const SessionRow = ({ session }: { session: ChatSessionWithRelations }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showExportSubmenu, setShowExportSubmenu] = useState(false);

    return (
      <div
        className={`group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer ${
          activeSessionId === session.id ? 'bg-muted' : ''
        } ${draggedSession === session.id ? 'opacity-50' : ''}`}
        onClick={() => onSessionSelect?.(session.id)}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          setDraggedSession(session.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => {
          setDraggedSession(null);
          setDragOverFolder(null);
        }}
      >
        {/* 드래그 핸들 */}
        <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-move" />
        
        {/* 선택 체크박스 */}
        {mode === 'modal' && (
          <input
            type="checkbox"
            checked={selectedSessions.has(session.id)}
            onChange={(e) => {
              e.stopPropagation();
              toggleSessionSelection(session.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{session.title}</h4>
            {session.isFavorite && (
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          
          {session.summary && (
            <p className="text-sm text-muted-foreground truncate">
              {session.summary}
            </p>
          )}
          
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {session.message_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {(session.total_tokens || 0).toLocaleString()}
            </span>
            {session.last_message_at && (
              <span>
                {formatDistanceToNow(new Date(session.last_message_at), {
                  addSuffix: true,
                  locale: ko
                })}
              </span>
            )}
          </div>
          
          {session.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {session.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-muted rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border rounded-lg shadow-lg z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(session.id);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-muted"
              >
                {session.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchiveSession(session.id, session.is_archived);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-muted"
              >
                {session.is_archived ? '보관 해제' : '보관'}
              </button>
              
              {/* 내보내기 메뉴 */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExportSubmenu(!showExportSubmenu);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-muted flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    내보내기
                  </span>
                  <ChevronRight className="w-3 h-3" />
                </button>
                
                {showExportSubmenu && (
                  <div className="absolute left-full top-0 ml-1 w-40 bg-card border rounded-lg shadow-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(session.id, 'json');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2"
                    >
                      <FileJson className="w-4 h-4" />
                      JSON
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(session.id, 'markdown');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Markdown
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(session.id, 'pdf');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2"
                    >
                      <FileImage className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                )}
              </div>
              
              {/* AI 요약 생성 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateSummary(session.id);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                AI 요약 생성
              </button>
              
              <div className="border-t my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSession(session.id);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-muted text-red-600"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 사이드바 모드
  if (mode === 'sidebar') {
    return (
      <aside className={`flex flex-col bg-accent/20 border-l-2 border-accent transition-all duration-300 overflow-hidden shadow-md ${
        isOpen ? 'w-80' : 'w-0'
      }`}>
        {isOpen && (
          <>
            {/* 헤더 */}
            <div className="flex-none p-4 border-b border-accent bg-background/50">
              <button
                onClick={() => {
                  if (!userId) {
                    alert('로그인이 필요합니다.');
                    return;
                  }
                  setShowNewSessionDialog(true);
                }}
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
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* 세션 목록 */}
            <div className="flex-1 overflow-y-auto px-2">
              <div className="space-y-1">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-body-md font-medium ${
                      activeSessionId === session.id
                        ? "bg-accent-light text-accent-focus border-l-2 border-accent-focus ml-[-2px]"
                        : "text-text-secondary hover:bg-accent-light hover:text-text-primary"
                    } ${draggedSession === session.id ? 'opacity-50' : ''}`}
                    onClick={() => {
                      setActiveSession(session.id);
                      onSessionSelect?.(session.id);
                    }}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      setDraggedSession(session.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDraggedSession(null);
                      setDragOverFolder(null);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{session.title}</span>
                    
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(session.id);
                        }}
                        className="p-1 hover:bg-background/20 rounded"
                      >
                        <Star className={`w-3 h-3 ${session.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className="p-1 hover:bg-background/20 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {sessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">대화가 없습니다</p>
                </div>
              )}
              
              {hasMore && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setPage(prev => prev + 1)}
                    disabled={loading}
                    className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 disabled:opacity-50 text-sm"
                  >
                    {loading ? '로딩 중...' : '더 보기'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* 새 세션 대화상자 */}
        {showNewSessionDialog && (
          <div className="fixed top-20 right-4 z-50">
            <div className="bg-white p-4 rounded-lg w-72 shadow-lg border border-gray-300">
              <h3 className="text-sm font-semibold mb-3">새 세션 만들기</h3>
              <input
                type="text"
                placeholder="세션 제목"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                className="w-full px-3 py-1.5 text-sm bg-muted rounded-lg outline-none focus:ring-2 focus:ring-primary mb-3"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowNewSessionDialog(false);
                    setNewSessionTitle('');
                  }}
                  className="px-3 py-1.5 text-sm hover:bg-muted rounded-lg"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!newSessionTitle.trim()}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  만들기
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  }

  // 모달 모드 (기존 코드)
  return (
    <div className="flex h-full bg-background">
      {/* 필터 사이드바 */}
      <aside className="w-80 border-r overflow-y-auto">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">세션 관리</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4">
          <FilterPanel />
        </div>
      </aside>
      
      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 툴바 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowNewSessionDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:brightness-90 transition-all"
            >
              <Plus className="w-4 h-4" />
              새 세션
            </button>
            
            <button
              onClick={() => setShowImportDialog(true)}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted"
            >
              <Upload className="w-4 h-4" />
              가져오기
            </button>
            
            {selectedSessions.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedSessions.size}개 선택됨
                </span>
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={exportLoading}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
                  >
                    {exportLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    일괄 내보내기
                  </button>
                  
                  {showExportMenu && (
                    <div className="absolute top-full mt-1 w-48 bg-card border rounded-lg shadow-lg z-50">
                      <button
                        onClick={() => handleBulkExport('json')}
                        className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2"
                      >
                        <FileJson className="w-4 h-4" />
                        JSON으로 내보내기
                      </button>
                      <button
                        onClick={() => handleBulkExport('markdown')}
                        className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Markdown으로 내보내기
                      </button>
                      <button
                        onClick={() => handleBulkExport('pdf')}
                        className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2"
                      >
                        <FileImage className="w-4 h-4" />
                        PDF로 내보내기
                      </button>
                    </div>
                  )}
                </div>
                
                {/* AI 요약 생성 버튼 */}
                <button
                  onClick={handleBulkGenerateSummaries}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted"
                >
                  <Sparkles className="w-4 h-4" />
                  AI 요약 생성
                </button>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* 보기 모드 */}
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'list'
                    ? 'bg-background shadow-sm'
                    : 'hover:bg-background/50'
                }`}
              >
                목록
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-background shadow-sm'
                    : 'hover:bg-background/50'
                }`}
              >
                그리드
              </button>
            </div>
          </div>
        </div>
        
        {/* 세션 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === 'list' ? (
            <div className="space-y-2">
              {sessions.map(session => (
                <SessionRow key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
          
          {/* 더 보기 */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={loading}
                className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 disabled:opacity-50"
              >
                {loading ? '로딩 중...' : '더 보기'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 새 세션 대화상자 */}
      {showNewSessionDialog && (
        <div className="fixed top-20 right-4 z-50">
          <div className="bg-white p-4 rounded-lg w-72 shadow-lg border border-gray-300">
            <h3 className="text-sm font-semibold mb-3">새 세션 만들기</h3>
            <input
              type="text"
              placeholder="세션 제목"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
              className="w-full px-3 py-1.5 text-sm bg-muted rounded-lg outline-none focus:ring-2 focus:ring-primary mb-3"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowNewSessionDialog(false);
                  setNewSessionTitle('');
                }}
                className="px-3 py-1.5 text-sm hover:bg-muted rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!newSessionTitle.trim()}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 가져오기 대화상자 */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">세션 가져오기</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                JSON 파일 선택
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 bg-muted rounded-lg outline-none focus:ring-2 focus:ring-primary"
              />
              {importFile && (
                <p className="mt-2 text-sm text-muted-foreground">
                  선택된 파일: {importFile.name}
                </p>
              )}
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportFile(null);
                }}
                className="px-4 py-2 hover:bg-muted rounded-lg"
                disabled={importLoading}
              >
                취소
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {importLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                가져오기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 그리드 뷰 카드 컴포넌트
function SessionCard({ session }: { session: ChatSessionWithRelations }) {
  return (
    <div className="p-4 bg-card border rounded-lg hover:shadow-lg transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium line-clamp-2">{session.title}</h4>
        {session.isFavorite && (
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
        )}
      </div>
      
      {session.summary && (
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {session.summary}
        </p>
      )}
      
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          {session.message_count || 0}
        </span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {(session.total_tokens || 0).toLocaleString()}
        </span>
      </div>
      
      {session.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {session.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}