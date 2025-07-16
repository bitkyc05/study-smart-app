export interface ProcessedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  url?: string;
  extractedText?: string;
  error?: string;
}

export interface FileContext {
  id: string;
  name: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  relevanceScore?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    fileContexts?: string[];
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  provider: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  messageCount: number;
  isArchived: boolean;
  providerSettings?: Record<string, any>;
}

export interface ProviderSettings {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
  customUrl?: string;
}

export interface ChatRequest {
  sessionId?: string;
  provider: 'openai' | 'anthropic' | 'google' | 'grok' | 'custom';
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  customUrl?: string;
  fileContexts?: string[];
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  sessionId: string;
  messageId: string;
}