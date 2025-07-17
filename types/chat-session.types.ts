// 채팅 세션 관련 타입 정의

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  folder_id?: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  
  // 확장된 필드
  summary?: string | null;
  language?: string;
  total_tokens?: number;
  message_count?: number;
  last_message_at?: string | null;
  search_vector?: string | null;
  
  // 관계
  chat_session_tags?: { tag_id: string }[];
  chat_tags?: ChatTag[];
  chat_favorites?: { user_id: string }[];
  provider_settings?: any;
  metadata?: Record<string, any>;
}

export interface ChatFolder {
  id: string;
  user_id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  position: number | null;
  created_at: string;
  updated_at: string;
  
  // 관계
  parent?: ChatFolder;
  children?: ChatFolder[];
}

export interface ChatTag {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface ChatFavorite {
  user_id: string;
  session_id: string;
  position: number;
  created_at: string;
}

export interface SharedChatSession {
  id: string;
  session_id: string;
  shared_by: string;
  shared_with?: string | null;
  share_token?: string | null;
  permissions: string[];
  expires_at?: string | null;
  accessed_count: number;
  created_at: string;
}

export interface ChatSessionWithRelations extends ChatSession {
  tags: string[];
  isFavorite: boolean;
  folder?: ChatFolder;
  provider: string;
  model: string;
}

export interface SessionFilter {
  search?: string;
  folderId?: string | null;
  tags?: string[];
  dateRange?: { start: Date; end: Date };
  providers?: string[];
  isFavorite?: boolean;
  isArchived?: boolean;
}

export interface SessionSearchResult {
  sessions: ChatSessionWithRelations[];
  total: number;
  hasMore: boolean;
}

export interface SessionSortOptions {
  page?: number;
  limit?: number;
  sortBy?: 'created' | 'updated' | 'messages' | 'tokens';
  sortOrder?: 'asc' | 'desc';
}