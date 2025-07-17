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
  isStreaming?: boolean;
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

// Speech Recognition types
export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Window interface extension
declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    currentRecognition?: SpeechRecognition;
  }
}