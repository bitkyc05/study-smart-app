import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatSession, ChatMessage, ProcessedFile, ProviderSettings } from '@/types/ai-chat.types';

interface AIChatState {
  // Sessions
  sessions: ChatSession[];
  activeSessionId: string | null;
  
  // Messages
  messages: Record<string, ChatMessage[]>; // sessionId -> messages
  
  // Files
  uploadedFiles: Record<string, ProcessedFile[]>; // sessionId -> files
  
  // Settings
  providerSettings: Record<string, ProviderSettings>; // provider -> settings
  
  // UI State
  isSidebarOpen: boolean;
  isLoading: boolean;
  streamingMessageId: string | null;
  
  // Actions
  setActiveSession: (sessionId: string | null) => void;
  addSession: (session: ChatSession) => void;
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  deleteSession: (sessionId: string) => void;
  
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (sessionId: string, messageId: string) => void;
  
  addUploadedFile: (sessionId: string, file: ProcessedFile) => void;
  updateUploadedFile: (sessionId: string, fileId: string, updates: Partial<ProcessedFile>) => void;
  removeUploadedFile: (sessionId: string, fileId: string) => void;
  
  setProviderSettings: (provider: string, settings: ProviderSettings) => void;
  
  setSidebarOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setStreamingMessageId: (messageId: string | null) => void;
  
  // Computed
  getActiveSession: () => ChatSession | undefined;
  getSessionMessages: (sessionId: string) => ChatMessage[];
  getSessionFiles: (sessionId: string) => ProcessedFile[];
}

export const useAIChatStore = create<AIChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessions: [],
      activeSessionId: null,
      messages: {},
      uploadedFiles: {},
      providerSettings: {
        openai: {
          model: 'gpt-4-turbo-preview',
          temperature: 0.7,
          maxTokens: 4096,
        },
        anthropic: {
          model: 'claude-3-opus-20240229',
          temperature: 0.7,
          maxTokens: 4096,
        },
        google: {
          model: 'gemini-pro',
          temperature: 0.7,
          maxTokens: 4096,
        },
        grok: {
          model: 'grok-1',
          temperature: 0.7,
          maxTokens: 4096,
        },
        custom: {
          model: '',
          temperature: 0.7,
          maxTokens: 4096,
          customUrl: '',
        },
      },
      isSidebarOpen: true,
      isLoading: false,
      streamingMessageId: null,

      // Actions
      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
      
      addSession: (session) => set((state) => ({
        sessions: [...state.sessions, session],
        messages: { ...state.messages, [session.id]: [] },
        uploadedFiles: { ...state.uploadedFiles, [session.id]: [] },
      })),
      
      updateSession: (sessionId, updates) => set((state) => {
        console.log('[Store] Updating session:', { sessionId, updates });
        const updatedSessions = state.sessions.map((s) =>
          s.id === sessionId ? { ...s, ...updates } : s
        );
        console.log('[Store] Updated sessions:', updatedSessions);
        return {
          sessions: updatedSessions,
        };
      }),
      
      deleteSession: (sessionId) => set((state) => {
        const { [sessionId]: _, ...restMessages } = state.messages;
        const { [sessionId]: __, ...restFiles } = state.uploadedFiles;
        
        return {
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          messages: restMessages,
          uploadedFiles: restFiles,
          activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
        };
      }),
      
      addMessage: (sessionId, message) => set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: [...(state.messages[sessionId] || []), message],
        },
      })),
      
      updateMessage: (sessionId, messageId, updates) => set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: (state.messages[sessionId] || []).map((m) =>
            m.id === messageId ? { ...m, ...updates } : m
          ),
        },
      })),
      
      deleteMessage: (sessionId, messageId) => set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: (state.messages[sessionId] || []).filter((m) => m.id !== messageId),
        },
      })),
      
      addUploadedFile: (sessionId, file) => set((state) => ({
        uploadedFiles: {
          ...state.uploadedFiles,
          [sessionId]: [...(state.uploadedFiles[sessionId] || []), file],
        },
      })),
      
      updateUploadedFile: (sessionId, fileId, updates) => set((state) => ({
        uploadedFiles: {
          ...state.uploadedFiles,
          [sessionId]: (state.uploadedFiles[sessionId] || []).map((f) =>
            f.id === fileId ? { ...f, ...updates } : f
          ),
        },
      })),
      
      removeUploadedFile: (sessionId, fileId) => set((state) => ({
        uploadedFiles: {
          ...state.uploadedFiles,
          [sessionId]: (state.uploadedFiles[sessionId] || []).filter((f) => f.id !== fileId),
        },
      })),
      
      setProviderSettings: (provider, settings) => set((state) => ({
        providerSettings: {
          ...state.providerSettings,
          [provider]: settings,
        },
      })),
      
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      setLoading: (loading) => set({ isLoading: loading }),
      setStreamingMessageId: (messageId) => set({ streamingMessageId: messageId }),
      
      // Computed
      getActiveSession: () => {
        const state = get();
        return state.sessions.find((s) => s.id === state.activeSessionId);
      },
      
      getSessionMessages: (sessionId) => {
        const state = get();
        return state.messages[sessionId] || [];
      },
      
      getSessionFiles: (sessionId) => {
        const state = get();
        return state.uploadedFiles[sessionId] || [];
      },
    }),
    {
      name: 'ai-chat-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        messages: state.messages,
        providerSettings: state.providerSettings,
      }),
    }
  )
);