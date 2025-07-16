/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  AIProvider,
  AIProviderConfig,
  AICompletionOptions,
  AICompletionResponse,
  AIStreamChunk,
  AIProviderError
} from '@/types/ai-provider';

export abstract class BaseAIAdapter implements AIProvider {
  protected config: AIProviderConfig;
  protected retryDelay = 1000;
  protected maxRetries = 3;
  
  constructor(config: AIProviderConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config
    };
  }
  
  abstract name: string;
  abstract complete(options: AICompletionOptions): Promise<AICompletionResponse>;
  abstract streamComplete(options: AICompletionOptions): AsyncIterable<AIStreamChunk>;
  abstract validateApiKey(): Promise<boolean>;
  abstract getAvailableModels(): Promise<string[]>;
  
  // 공통 재시도 로직
  protected async withRetry<T>(
    operation: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(this.retryDelay);
        this.retryDelay *= 2; // 지수 백오프
        return this.withRetry(operation, retries - 1);
      }
      throw error;
    }
  }
  
  protected isRetryableError(error: any): boolean {
    // 429 (Rate Limit), 502, 503, 504 (서버 에러)
    const retryableCodes = [429, 502, 503, 504];
    return error.status && retryableCodes.includes(error.status);
  }
  
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 토큰 계산 (근사치)
  protected estimateTokens(text: string): number {
    // 간단한 추정: 4자 = 1토큰 (영어 기준)
    // 한글의 경우 대략 2-3자 = 1토큰이지만, 보수적으로 계산
    const koreanRatio = (text.match(/[\u3131-\uD79D]/g) || []).length / text.length;
    const avgCharsPerToken = koreanRatio > 0.5 ? 2.5 : 4;
    return Math.ceil(text.length / avgCharsPerToken);
  }
  
  // 비용 계산 기본 구현
  calculateCost(usage: AICompletionResponse['usage'], model: string): number {
    // 각 어댑터에서 오버라이드
    return 0;
  }
  
  // 스트리밍 헬퍼
  protected async *parseSSEStream(
    response: Response
  ): AsyncIterable<string> {
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
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;
            yield data;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  // 요청 헤더 생성 헬퍼
  protected buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...additionalHeaders
    };
  }
  
  // 에러 응답 처리 헬퍼
  protected async handleErrorResponse(response: Response, provider: string): Promise<never> {
    let errorMessage = `${provider} API error`;
    let errorDetails = null;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorDetails = await response.json();
        errorMessage = errorDetails.error?.message || errorDetails.message || errorMessage;
      } else {
        errorMessage = await response.text();
      }
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }
    
    throw new AIProviderError(errorMessage, response.status, errorDetails);
  }
  
  // 타임아웃 처리를 위한 AbortSignal 생성
  protected createAbortSignal(): AbortSignal {
    if (this.config.timeout) {
      return AbortSignal.timeout(this.config.timeout);
    }
    return new AbortController().signal;
  }
  
  // 메시지 내용 유효성 검증
  protected validateMessages(messages: AICompletionOptions['messages']): void {
    if (!messages || messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }
    
    for (const message of messages) {
      if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
        throw new Error(`Invalid message role: ${message.role}`);
      }
      
      if (typeof message.content !== 'string') {
        throw new Error('Message content must be a string');
      }
    }
  }
  
  // 모델 이름 정규화 (프로바이더별 별칭 처리)
  protected normalizeModelName(model: string): string {
    // 기본 구현은 그대로 반환, 각 어댑터에서 오버라이드 가능
    return model;
  }
  
  // 컨텍스트 길이 체크
  protected checkContextLength(
    messages: AICompletionOptions['messages'],
    maxTokens: number = 0,
    modelLimit: number
  ): void {
    const estimatedInputTokens = messages.reduce((total, msg) => {
      return total + this.estimateTokens(msg.content);
    }, 0);
    
    const totalRequired = estimatedInputTokens + maxTokens;
    
    if (totalRequired > modelLimit) {
      throw new Error(
        `Token limit exceeded: ${totalRequired} tokens required, but model limit is ${modelLimit}`
      );
    }
  }
  
  // 안전한 JSON 파싱
  protected safeJsonParse<T>(text: string): T | null {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  
  // 스트리밍 응답 버퍼링 (작은 청크 방지)
  protected async *bufferStream(
    stream: AsyncIterable<AIStreamChunk>,
    minChunkSize: number = 10
  ): AsyncIterable<AIStreamChunk> {
    let buffer = '';
    
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        buffer += chunk.choices[0].delta.content;
        
        if (buffer.length >= minChunkSize) {
          yield {
            choices: [{
              delta: { content: buffer },
              index: 0
            }]
          };
          buffer = '';
        }
      } else {
        // 컨텐츠가 아닌 청크는 즉시 전달
        yield chunk;
      }
    }
    
    // 남은 버퍼 전달
    if (buffer) {
      yield {
        choices: [{
          delta: { content: buffer },
          index: 0
        }]
      };
    }
  }
  
  // 디버그 로깅 (개발 환경에서만)
  protected log(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.name}] ${message}`, data || '');
    }
  }
}