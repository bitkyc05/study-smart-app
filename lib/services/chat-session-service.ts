import { createClient } from '@/lib/supabase/client';
import { 
  ChatSession, 
  ChatFolder, 
  ChatTag, 
  ChatSessionWithRelations,
  SessionFilter,
  SessionSearchResult,
  SessionSortOptions
} from '@/types/chat-session.types';

export class ChatSessionService {
  private supabase = createClient();

  async searchSessions(
    userId: string,
    filter: SessionFilter,
    options: SessionSortOptions = {}
  ): Promise<SessionSearchResult> {
    const supabase = this.supabase;
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'updated', 
      sortOrder = 'desc' 
    } = options;

    let query = supabase
      .from('ai_chat_sessions')
      .select(`
        *,
        chat_session_tags!left(tag_id),
        chat_favorites!left(user_id)
      `, { count: 'exact' })
      .eq('user_id', userId);

    // 검색어 필터
    if (filter.search) {
      query = query.or(`
        title.ilike.%${filter.search}%,
        summary.ilike.%${filter.search}%
      `);
    }

    // 폴더 필터
    if (filter.folderId !== undefined) {
      if (filter.folderId === null) {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', filter.folderId);
      }
    }

    // 날짜 범위
    if (filter.dateRange) {
      query = query
        .gte('created_at', filter.dateRange.start.toISOString())
        .lte('created_at', filter.dateRange.end.toISOString());
    }

    // 프로바이더 필터
    if (filter.providers && filter.providers.length > 0) {
      query = query.in('provider_settings->>provider', filter.providers);
    }

    // 아카이브
    if (filter.isArchived !== undefined) {
      query = query.eq('is_archived', filter.isArchived);
    } else {
      // 기본적으로 아카이브되지 않은 세션만 표시
      query = query.eq('is_archived', false);
    }

    // 정렬
    const sortColumn = {
      created: 'created_at',
      updated: 'updated_at',
      messages: 'message_count',
      tokens: 'total_tokens'
    }[sortBy];

    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // 페이지네이션
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    // 태그 정보 가져오기
    let sessions: ChatSessionWithRelations[] = [];
    if (data && data.length > 0) {
      const sessionIds = data.map(s => s.id);
      
      // 태그 정보 조회
      const { data: sessionTags } = await supabase
        .from('chat_session_tags')
        .select(`
          session_id,
          chat_tags(id, name, color)
        `)
        .in('session_id', sessionIds);

      // 즐겨찾기 정보 조회
      const { data: favorites } = await supabase
        .from('chat_favorites')
        .select('session_id')
        .eq('user_id', userId)
        .in('session_id', sessionIds);

      const favoriteSet = new Set(favorites?.map(f => f.session_id) || []);

      // 태그별 필터링
      if (filter.tags && filter.tags.length > 0) {
        const tagFilterSet = new Set(filter.tags);
        sessions = data
          .filter(session => {
            const sessionTagIds = sessionTags
              ?.filter(st => st.session_id === session.id)
              .map(st => st.chat_tags?.id)
              .filter(Boolean) || [];
            return sessionTagIds.some(tagId => tagFilterSet.has(tagId));
          })
          .map(session => this.transformSession(session, sessionTags || [], favoriteSet));
      } else {
        sessions = data.map(session => 
          this.transformSession(session, sessionTags || [], favoriteSet)
        );
      }

      // 즐겨찾기 필터
      if (filter.isFavorite) {
        sessions = sessions.filter(s => s.isFavorite);
      }
    }

    return {
      sessions,
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    };
  }

  async createSession(
    userId: string,
    data: {
      title: string;
      folderId?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
      provider?: string;
      model?: string;
    }
  ): Promise<ChatSessionWithRelations> {
    const supabase = this.supabase;
    
    const providerSettings = data.provider && data.model ? {
      provider: data.provider,
      model: data.model,
      temperature: 0.7,
      maxTokens: 4096
    } : undefined;

    const { data: session, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        user_id: userId,
        title: data.title,
        folder_id: data.folderId,
        metadata: data.metadata || {},
        provider_settings: providerSettings,
        is_archived: false
      })
      .select()
      .single();

    if (error) throw error;

    // 태그 연결
    if (data.tags && data.tags.length > 0) {
      await this.addTags(session.id, data.tags, userId);
    }

    return this.transformSession(session, [], new Set());
  }

  async updateSession(
    sessionId: string,
    updates: Partial<{
      title: string;
      folderId: string | null;
      summary: string;
      isArchived: boolean;
      provider: string;
      model: string;
    }>
  ): Promise<void> {
    const supabase = this.supabase;
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.folderId !== undefined) updateData.folder_id = updates.folderId;
    if (updates.summary !== undefined) updateData.summary = updates.summary;
    if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived;
    
    if (updates.provider !== undefined || updates.model !== undefined) {
      // 현재 provider_settings 가져오기
      const { data: currentSession } = await supabase
        .from('ai_chat_sessions')
        .select('provider_settings')
        .eq('id', sessionId)
        .single();
      
      if (currentSession) {
        updateData.provider_settings = {
          ...currentSession.provider_settings,
          ...(updates.provider && { provider: updates.provider }),
          ...(updates.model && { model: updates.model })
        };
      }
    }

    const { error } = await supabase
      .from('ai_chat_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) throw error;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const supabase = this.supabase;
    const { error } = await supabase
      .from('ai_chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }

  async bulkOperation(
    sessionIds: string[],
    operation: 'delete' | 'archive' | 'unarchive' | 'move',
    options?: { folderId?: string }
  ): Promise<void> {
    const supabase = this.supabase;
    
    switch (operation) {
      case 'delete':
        await supabase
          .from('ai_chat_sessions')
          .delete()
          .in('id', sessionIds);
        break;

      case 'archive':
        await supabase
          .from('ai_chat_sessions')
          .update({ is_archived: true })
          .in('id', sessionIds);
        break;

      case 'unarchive':
        await supabase
          .from('ai_chat_sessions')
          .update({ is_archived: false })
          .in('id', sessionIds);
        break;

      case 'move':
        if (options?.folderId !== undefined) {
          await supabase
            .from('ai_chat_sessions')
            .update({ folder_id: options.folderId })
            .in('id', sessionIds);
        }
        break;
    }
  }

  // 태그 관리
  async getTags(userId: string): Promise<ChatTag[]> {
    const supabase = this.supabase;
    const { data, error } = await supabase
      .from('chat_tags')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async addTags(sessionId: string, tagNames: string[], userId: string): Promise<void> {
    const supabase = this.supabase;
    
    // 태그 생성 또는 조회
    const tags = await Promise.all(
      tagNames.map(name => this.ensureTag(name, userId))
    );

    // 연결
    const connections = tags.map(tag => ({
      session_id: sessionId,
      tag_id: tag.id
    }));

    await supabase
      .from('chat_session_tags')
      .upsert(connections, { onConflict: 'session_id,tag_id' });
  }

  async removeTags(sessionId: string, tagIds: string[]): Promise<void> {
    const supabase = this.supabase;
    await supabase
      .from('chat_session_tags')
      .delete()
      .eq('session_id', sessionId)
      .in('tag_id', tagIds);
  }

  // 폴더 관리
  async getFolders(userId: string): Promise<ChatFolder[]> {
    const supabase = this.supabase;
    const { data, error } = await supabase
      .from('chat_folders')
      .select('*')
      .eq('user_id', userId)
      .order('position');

    if (error) throw error;
    
    // 계층 구조 구성
    return this.buildFolderTree(data || []);
  }

  async createFolder(
    userId: string,
    data: {
      name: string;
      parentId?: string;
      color?: string;
      icon?: string;
    }
  ): Promise<string> {
    const supabase = this.supabase;
    const { data: folder, error } = await supabase
      .from('chat_folders')
      .insert({
        user_id: userId,
        name: data.name,
        parent_id: data.parentId,
        color: data.color,
        icon: data.icon
      })
      .select('id')
      .single();

    if (error) throw error;
    return folder.id;
  }

  async updateFolder(
    folderId: string,
    updates: Partial<{
      name: string;
      color: string;
      icon: string;
      parentId: string | null;
    }>
  ): Promise<void> {
    const supabase = this.supabase;
    
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;

    const { error } = await supabase
      .from('chat_folders')
      .update(updateData)
      .eq('id', folderId);

    if (error) throw error;
  }

  async deleteFolder(folderId: string): Promise<void> {
    const supabase = this.supabase;
    const { error } = await supabase
      .from('chat_folders')
      .delete()
      .eq('id', folderId);

    if (error) throw error;
  }

  // 즐겨찾기
  async toggleFavorite(
    userId: string,
    sessionId: string
  ): Promise<boolean> {
    const supabase = this.supabase;
    
    const { data: existing } = await supabase
      .from('chat_favorites')
      .select('user_id')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .single();

    if (existing) {
      await supabase
        .from('chat_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('session_id', sessionId);
      return false;
    } else {
      await supabase
        .from('chat_favorites')
        .insert({
          user_id: userId,
          session_id: sessionId
        });
      return true;
    }
  }

  // 세션 요약 생성
  async generateSummary(sessionId: string): Promise<string> {
    const supabase = this.supabase;
    
    // 최근 메시지 조회
    const { data: messages } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (!messages || messages.length === 0) {
      return '';
    }

    // 간단한 요약 생성 (실제로는 AI API 호출)
    const summary = messages
      .slice(0, 3)
      .map(m => m.content.slice(0, 50))
      .join(' ');

    // 저장
    await this.updateSession(sessionId, { summary });

    return summary;
  }

  // 내보내기
  async exportSession(
    sessionId: string,
    format: 'json' | 'markdown' | 'pdf' = 'json'
  ): Promise<Blob> {
    const supabase = this.supabase;
    
    // 전체 데이터 조회
    const { data: session } = await supabase
      .from('ai_chat_sessions')
      .select(`
        *,
        ai_chat_messages(*)
      `)
      .eq('id', sessionId)
      .single();

    if (!session) throw new Error('Session not found');

    switch (format) {
      case 'json':
        return new Blob(
          [JSON.stringify(session, null, 2)],
          { type: 'application/json' }
        );

      case 'markdown':
        const markdown = this.convertToMarkdown(session);
        return new Blob([markdown], { type: 'text/markdown' });

      case 'pdf':
        // 실제 구현에서는 PDF 생성 라이브러리 사용
        const pdfContent = this.convertToMarkdown(session);
        return new Blob([pdfContent], { type: 'application/pdf' });

      default:
        throw new Error('Unsupported format');
    }
  }

  // 가져오기
  async importSession(
    userId: string,
    data: any
  ): Promise<string> {
    const supabase = this.supabase;
    
    // 새 세션 생성
    const { data: newSession, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        user_id: userId,
        title: data.title + ' (가져옴)',
        metadata: {
          ...data.metadata,
          imported_at: new Date().toISOString(),
          original_id: data.id
        },
        provider_settings: data.provider_settings,
        is_archived: false
      })
      .select()
      .single();

    if (error) throw error;

    // 메시지 가져오기
    if (data.ai_chat_messages && data.ai_chat_messages.length > 0) {
      const messages = data.ai_chat_messages.map((msg: any) => ({
        session_id: newSession.id,
        user_id: userId,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
        created_at: msg.created_at
      }));

      await supabase
        .from('ai_chat_messages')
        .insert(messages);
    }

    return newSession.id;
  }

  // 세션 공유
  async shareSession(
    sessionId: string,
    userId: string,
    options: {
      permissions?: string[];
      expiresIn?: number; // 시간 (초)
      shareWith?: string; // 특정 사용자 ID
    } = {}
  ): Promise<string> {
    const supabase = this.supabase;
    const shareToken = crypto.randomUUID();
    const expiresAt = options.expiresIn
      ? new Date(Date.now() + options.expiresIn * 1000).toISOString()
      : null;

    await supabase
      .from('shared_chat_sessions')
      .insert({
        session_id: sessionId,
        shared_by: userId,
        shared_with: options.shareWith,
        share_token: shareToken,
        permissions: options.permissions || ['view'],
        expires_at: expiresAt
      });

    return shareToken;
  }

  // 헬퍼 메서드들
  private transformSession(
    raw: any,
    sessionTags: any[],
    favoriteSet: Set<string>
  ): ChatSessionWithRelations {
    const tags = sessionTags
      .filter(st => st.session_id === raw.id && st.chat_tags)
      .map(st => st.chat_tags.name);

    // provider_settings에서 provider와 model 추출
    const provider = raw.provider_settings?.provider || 'openai';
    const model = raw.provider_settings?.model || '';

    return {
      ...raw,
      provider,
      model,
      tags: tags,
      isFavorite: favoriteSet.has(raw.id)
    };
  }

  private async ensureTag(name: string, userId: string): Promise<{ id: string }> {
    const supabase = this.supabase;
    
    // 먼저 기존 태그 확인
    const { data: existing } = await supabase
      .from('chat_tags')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .single();

    if (existing) return existing;

    // 없으면 생성
    const { data: newTag, error } = await supabase
      .from('chat_tags')
      .insert({ user_id: userId, name })
      .select('id')
      .single();

    if (error) throw error;
    return newTag;
  }

  private buildFolderTree(folders: ChatFolder[]): ChatFolder[] {
    const folderMap = new Map<string, ChatFolder>();
    const rootFolders: ChatFolder[] = [];

    // 모든 폴더를 맵에 저장
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // 계층 구조 구성
    folders.forEach(folder => {
      const folderWithChildren = folderMap.get(folder.id)!;
      if (folder.parent_id) {
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(folderWithChildren);
        }
      } else {
        rootFolders.push(folderWithChildren);
      }
    });

    return rootFolders;
  }

  private convertToMarkdown(session: any): string {
    let markdown = `# ${session.title}\n\n`;
    markdown += `Created: ${new Date(session.created_at).toLocaleDateString()}\n\n`;
    
    if (session.summary) {
      markdown += `## Summary\n${session.summary}\n\n`;
    }

    markdown += `## Messages\n\n`;
    
    for (const msg of session.ai_chat_messages || []) {
      markdown += `### ${msg.role.toUpperCase()}\n`;
      markdown += `${msg.content}\n\n`;
    }

    return markdown;
  }
}