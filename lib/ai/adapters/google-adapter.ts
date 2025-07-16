import { BaseAIAdapter } from '../base-adapter';
import {
  AICompletionOptions,
  AICompletionResponse,
  AIStreamChunk,
  AIMessage,
  MODEL_CONTEXT_LIMITS
} from '@/types/ai-provider';

interface GeminiContent {
  parts: Array<{
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string; // base64
    };
  }>;
  role: 'user' | 'model';
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
    candidateCount?: number;
    responseMimeType?: string;
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiStreamChunk {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason?: string;
    index: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GoogleAdapter extends BaseAIAdapter {
  name = 'google';
  
  private modelPricing: Record<string, { prompt: number; completion: number }> = {
    'gemini-1.5-flash': { prompt: 0.000035, completion: 0.00014 }, // per 1K chars
    'gemini-1.5-pro': { prompt: 0.00035, completion: 0.0014 },
    'gemini-2.0-flash': { prompt: 0.000035, completion: 0.00014 },
    'gemini-2.0-pro': { prompt: 0.00035, completion: 0.0014 }
  };
  
  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    this.validateMessages(options.messages);
    
    // 컨텍스트 길이 체크
    const modelLimit = MODEL_CONTEXT_LIMITS[options.model] || 1048576;
    this.checkContextLength(options.messages, options.maxTokens || 0, modelLimit);
    
    return this.withRetry(async () => {
      const geminiRequest = this.transformRequest(options);
      
      const response = await fetch(
        `${this.config.baseUrl || 'https://generativelanguage.googleapis.com'}/v1/models/${options.model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(geminiRequest),
          signal: this.createAbortSignal()
        }
      );
      
      if (!response.ok) {
        await this.handleErrorResponse(response, 'Google Gemini');
      }
      
      const data: GeminiResponse = await response.json();
      return this.transformResponse(data, options.model);
    });
  }
  
  async *streamComplete(options: AICompletionOptions): AsyncIterable<AIStreamChunk> {
    this.validateMessages(options.messages);
    
    const geminiRequest = this.transformRequest(options);
    
    const response = await fetch(
      `${this.config.baseUrl || 'https://generativelanguage.googleapis.com'}/v1/models/${options.model}:streamGenerateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(geminiRequest),
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'Google Gemini');
    }
    
    // Gemini는 표준 SSE가 아닌 NDJSON 형식 사용
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) throw new Error('No response body');
    
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            const chunk = this.safeJsonParse<GeminiStreamChunk>(line);
            if (chunk) {
              yield this.transformStreamChunk(chunk);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.baseUrl || 'https://generativelanguage.googleapis.com'}/v1/models?key=${this.config.apiKey}`,
        {
          signal: this.createAbortSignal()
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async getAvailableModels(): Promise<string[]> {
    const response = await fetch(
      `${this.config.baseUrl || 'https://generativelanguage.googleapis.com'}/v1/models?key=${this.config.apiKey}`,
      {
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'Google Gemini');
    }
    
    const data = await response.json();
    return data.models
      .filter((model: any) => model.supportedGenerationMethods.includes('generateContent'))
      .map((model: any) => model.name.replace('models/', ''))
      .sort();
  }
  
  calculateCost(usage: AICompletionResponse['usage'], model: string): number {
    const pricing = this.modelPricing[model];
    if (!pricing) {
      this.log(`No pricing information for model: ${model}`);
      return 0;
    }
    
    // Gemini는 문자 단위로 과금 (1K chars)
    // 토큰을 문자로 변환 (근사치: 1 토큰 ≈ 4 문자)
    const promptChars = usage.promptTokens * 4;
    const completionChars = usage.completionTokens * 4;
    
    const promptCost = (promptChars / 1000) * pricing.prompt;
    const completionCost = (completionChars / 1000) * pricing.completion;
    
    return promptCost + completionCost;
  }
  
  private transformRequest(options: AICompletionOptions): GeminiRequest {
    const contents = this.prepareGeminiContents(options.messages);
    const systemInstruction = this.extractSystemInstruction(options.messages);
    
    const request: GeminiRequest = {
      contents,
      generationConfig: {
        temperature: options.temperature,
        topP: options.topP,
        maxOutputTokens: options.maxTokens,
        stopSequences: options.stop,
        candidateCount: 1
      }
    };
    
    // JSON 모드 지원
    if (options.responseFormat?.type === 'json_object') {
      request.generationConfig!.responseMimeType = 'application/json';
    }
    
    // 시스템 명령어 추가
    if (systemInstruction) {
      request.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }
    
    // 안전 설정 (기본값: 모든 카테고리 비활성화)
    request.safetySettings = [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }
    ];
    
    return request;
  }
  
  private prepareGeminiContents(messages: AIMessage[]): GeminiContent[] {
    const contents: GeminiContent[] = [];
    
    for (const msg of messages) {
      if (msg.role === 'system') continue; // 시스템 메시지는 별도 처리
      
      const role = msg.role === 'assistant' ? 'model' : 'user';
      
      // 이미지나 다른 멀티모달 컨텐츠 처리 가능
      contents.push({
        role,
        parts: [{ text: msg.content }]
      });
    }
    
    // Gemini는 user로 시작해야 함
    if (contents.length > 0 && contents[0].role !== 'user') {
      contents.unshift({
        role: 'user',
        parts: [{ text: 'Begin conversation.' }]
      });
    }
    
    // 연속된 같은 역할 병합
    const mergedContents: GeminiContent[] = [];
    let lastRole: string | null = null;
    let partBuffer: Array<{ text: string }> = [];
    
    for (const content of contents) {
      if (content.role === lastRole) {
        partBuffer.push(...content.parts);
      } else {
        if (lastRole !== null) {
          mergedContents.push({
            role: lastRole as 'user' | 'model',
            parts: partBuffer
          });
        }
        lastRole = content.role;
        partBuffer = [...content.parts];
      }
    }
    
    if (lastRole !== null) {
      mergedContents.push({
        role: lastRole as 'user' | 'model',
        parts: partBuffer
      });
    }
    
    return mergedContents;
  }
  
  private extractSystemInstruction(messages: AIMessage[]): string | undefined {
    const systemMessages = messages
      .filter(m => m.role === 'system')
      .map(m => m.content);
    
    return systemMessages.length > 0 ? systemMessages.join('\n\n') : undefined;
  }
  
  private transformResponse(data: GeminiResponse, model: string): AICompletionResponse {
    const candidate = data.candidates[0];
    const content = candidate?.content?.parts?.map(p => p.text).join('') || '';
    
    return {
      id: `gemini-${Date.now()}`,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content
        },
        finishReason: this.normalizeFinishReason(candidate?.finishReason || 'STOP')
      }],
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      },
      model,
      created: Math.floor(Date.now() / 1000)
    };
  }
  
  private transformStreamChunk(data: GeminiStreamChunk): AIStreamChunk {
    const candidate = data.candidates[0];
    const content = candidate?.content?.parts?.map(p => p.text).join('') || '';
    
    return {
      choices: [{
        delta: {
          content: content || undefined
        },
        index: 0,
        finishReason: candidate?.finishReason
      }]
    };
  }
  
  private normalizeFinishReason(reason: string): 'stop' | 'length' | 'function_call' | 'content_filter' {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
  
  protected normalizeModelName(model: string): string {
    // 간략한 이름을 정식 이름으로 변환
    const modelAliases: Record<string, string> = {
      'gemini-flash': 'gemini-1.5-flash',
      'gemini-pro': 'gemini-1.5-pro',
      'gemini-2-flash': 'gemini-2.0-flash',
      'gemini-2-pro': 'gemini-2.0-pro',
      'flash': 'gemini-1.5-flash',
      'pro': 'gemini-1.5-pro'
    };
    
    return modelAliases[model] || model;
  }
  
  // Google 특화 기능
  async embedText(text: string, model = 'text-embedding-004'): Promise<number[]> {
    const response = await fetch(
      `${this.config.baseUrl || 'https://generativelanguage.googleapis.com'}/v1/models/${model}:embedContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: `models/${model}`,
          content: {
            parts: [{ text }]
          }
        }),
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'Google Gemini');
    }
    
    const data = await response.json();
    return data.embedding.values;
  }
  
  async processMultimodal(
    messages: Array<{
      role: 'user' | 'assistant';
      content: string | { type: 'text' | 'image'; data: string }[];
    }>,
    model = 'gemini-1.5-pro'
  ): Promise<AICompletionResponse> {
    const contents: GeminiContent[] = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: Array.isArray(msg.content)
        ? msg.content.map(part => {
            if (part.type === 'text') {
              return { text: part.data };
            } else {
              // 이미지는 base64 형식이어야 함
              return {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: part.data
                }
              };
            }
          })
        : [{ text: msg.content }]
    }));
    
    const request: GeminiRequest = { contents };
    
    const response = await fetch(
      `${this.config.baseUrl || 'https://generativelanguage.googleapis.com'}/v1/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(request),
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'Google Gemini');
    }
    
    const data: GeminiResponse = await response.json();
    return this.transformResponse(data, model);
  }
}