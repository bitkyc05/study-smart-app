export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface AICompletionOptions {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  functions?: AIFunction[];
  functionCall?: 'auto' | 'none' | { name: string };
  responseFormat?: { type: 'text' | 'json_object' };
  user?: string;
}

export interface AIFunction {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AICompletionResponse {
  id: string;
  choices: AIChoice[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  created: number;
}

export interface AIChoice {
  index: number;
  message: AIMessage;
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter';
}

export interface AIStreamChunk {
  choices: Array<{
    delta: Partial<AIMessage>;
    index: number;
    finishReason?: string;
  }>;
}

export interface AIProvider {
  name: string;
  
  // 기본 메서드
  complete(options: AICompletionOptions): Promise<AICompletionResponse>;
  streamComplete(options: AICompletionOptions): AsyncIterable<AIStreamChunk>;
  
  // 유틸리티 메서드
  validateApiKey(): Promise<boolean>;
  getAvailableModels(): Promise<string[]>;
  calculateCost(usage: AICompletionResponse['usage'], model: string): number;
  
  // 프로바이더별 특수 기능
  embedText?(text: string, model?: string): Promise<number[]>;
  generateImage?(prompt: string, options?: any): Promise<string>;
  transcribeAudio?(audio: Blob, options?: any): Promise<string>;
}

export interface AIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
}

// 프로바이더 타입
export type ProviderType = 'openai' | 'anthropic' | 'google' | 'grok' | 'custom';

// 에러 클래스
export class AIProviderError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

// 모델 별칭 매핑
export const MODEL_ALIASES: Record<string, Record<ProviderType, string>> = {
  'fast': {
    openai: 'gpt-3.5-turbo',
    anthropic: 'claude-3-haiku-20240307',
    google: 'gemini-1.5-flash',
    grok: 'grok-1',
    custom: 'default-fast'
  },
  'balanced': {
    openai: 'gpt-4',
    anthropic: 'claude-3-5-sonnet-20241022',
    google: 'gemini-1.5-pro',
    grok: 'grok-2',
    custom: 'default-balanced'
  },
  'powerful': {
    openai: 'gpt-4-turbo',
    anthropic: 'claude-3-opus-20240229',
    google: 'gemini-2.0-pro',
    grok: 'grok-2-advanced',
    custom: 'default-powerful'
  }
};

// 모델별 컨텍스트 한계
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'gpt-3.5-turbo': 16385,
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'claude-3-haiku-20240307': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-opus-20240229': 200000,
  'gemini-1.5-flash': 1048576,
  'gemini-1.5-pro': 2097152,
  'grok-1': 8192,
  'grok-2': 32768
};

// 프로바이더별 기능 지원 매트릭스
export const PROVIDER_CAPABILITIES: Record<ProviderType, {
  streaming: boolean;
  functions: boolean;
  vision: boolean;
  audio: boolean;
  embeddings: boolean;
  jsonMode: boolean;
}> = {
  openai: {
    streaming: true,
    functions: true,
    vision: true,
    audio: true,
    embeddings: true,
    jsonMode: true
  },
  anthropic: {
    streaming: true,
    functions: false,
    vision: true,
    audio: false,
    embeddings: false,
    jsonMode: false
  },
  google: {
    streaming: true,
    functions: true,
    vision: true,
    audio: true,
    embeddings: true,
    jsonMode: true
  },
  grok: {
    streaming: true,
    functions: false,
    vision: false,
    audio: false,
    embeddings: false,
    jsonMode: false
  },
  custom: {
    streaming: true,
    functions: true,
    vision: false,
    audio: false,
    embeddings: false,
    jsonMode: false
  }
};