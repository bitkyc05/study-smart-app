/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BaseAIAdapter } from '../base-adapter';
import {
  AICompletionOptions,
  AICompletionResponse,
  AIStreamChunk,
  AIProviderConfig
} from '@/types/ai-provider';

// Custom 어댑터 설정을 위한 확장 인터페이스
interface CustomProviderConfig extends AIProviderConfig {
  // API 형식 (OpenAI 호환 또는 커스텀)
  apiFormat?: 'openai' | 'custom';
  // 커스텀 엔드포인트 경로
  completionPath?: string;
  streamPath?: string;
  modelsPath?: string;
  // 요청/응답 변환 함수
  requestTransformer?: (request: any) => any;
  responseTransformer?: (response: any) => any;
  // 인증 방식
  authType?: 'bearer' | 'apikey' | 'custom';
  authHeader?: string;
  // 모델 정보
  supportedModels?: string[];
  defaultModel?: string;
}

export class CustomAdapter extends BaseAIAdapter {
  name = 'custom';
  private customConfig: CustomProviderConfig;
  
  constructor(config: CustomProviderConfig) {
    super(config);
    this.customConfig = {
      apiFormat: 'openai',
      completionPath: '/v1/chat/completions',
      streamPath: '/v1/chat/completions',
      modelsPath: '/v1/models',
      authType: 'bearer',
      authHeader: 'Authorization',
      ...config
    };
  }
  
  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    this.validateMessages(options.messages);
    
    return this.withRetry(async () => {
      let requestBody: any;
      
      if (this.customConfig.apiFormat === 'openai') {
        // OpenAI 호환 형식
        requestBody = {
          model: options.model || this.customConfig.defaultModel || 'default',
          messages: options.messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          top_p: options.topP,
          frequency_penalty: options.frequencyPenalty,
          presence_penalty: options.presencePenalty,
          stop: options.stop,
          stream: false,
          functions: options.functions,
          function_call: options.functionCall,
          response_format: options.responseFormat,
          user: options.user
        };
      } else {
        // 커스텀 형식 - 기본 구조
        const { messages, model, temperature, maxTokens, ...restOptions } = options;
        requestBody = {
          prompt: this.messagesToPrompt(messages),
          model: model || this.customConfig.defaultModel,
          temperature,
          max_tokens: maxTokens,
          ...restOptions
        };
      }
      
      // 커스텀 요청 변환 적용
      if (this.customConfig.requestTransformer) {
        requestBody = this.customConfig.requestTransformer(requestBody);
      }
      
      const url = `${this.customConfig.baseUrl}${this.customConfig.completionPath}`;
      const headers = this.buildAuthHeaders();
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: this.createAbortSignal()
      });
      
      if (!response.ok) {
        await this.handleErrorResponse(response, 'Custom Provider');
      }
      
      let data = await response.json();
      
      // 커스텀 응답 변환 적용
      if (this.customConfig.responseTransformer) {
        data = this.customConfig.responseTransformer(data);
      }
      
      return this.transformResponse(data, options);
    });
  }
  
  async *streamComplete(options: AICompletionOptions): AsyncIterable<AIStreamChunk> {
    this.validateMessages(options.messages);
    
    let requestBody: any;
    
    if (this.customConfig.apiFormat === 'openai') {
      requestBody = {
        model: options.model || this.customConfig.defaultModel || 'default',
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stop,
        stream: true,
        functions: options.functions,
        function_call: options.functionCall,
        response_format: options.responseFormat,
        user: options.user
      };
    } else {
      requestBody = {
        prompt: this.messagesToPrompt(options.messages),
        stream: true,
        ...options,
        model: options.model || this.customConfig.defaultModel
      };
    }
    
    if (this.customConfig.requestTransformer) {
      requestBody = this.customConfig.requestTransformer(requestBody);
    }
    
    const url = `${this.customConfig.baseUrl}${this.customConfig.streamPath}`;
    const headers = this.buildAuthHeaders();
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: this.createAbortSignal()
    });
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'Custom Provider');
    }
    
    // 스트리밍 응답 처리
    if (this.customConfig.apiFormat === 'openai') {
      // OpenAI 호환 SSE 스트림
      for await (const chunk of this.parseSSEStream(response)) {
        let data = this.safeJsonParse<any>(chunk);
        if (data) {
          if (this.customConfig.responseTransformer) {
            data = this.customConfig.responseTransformer(data);
          }
          yield this.transformStreamChunk(data);
        }
      }
    } else {
      // 커스텀 스트림 형식
      yield* this.parseCustomStream(response);
    }
  }
  
  async validateApiKey(): Promise<boolean> {
    try {
      if (this.customConfig.supportedModels && this.customConfig.supportedModels.length > 0) {
        // 미리 정의된 모델이 있으면 API 검증 생략
        return true;
      }
      
      // 모델 목록을 가져와서 검증
      const models = await this.getAvailableModels();
      return models.length > 0;
    } catch {
      // 실패해도 true 반환 (커스텀 프로바이더는 유연하게 처리)
      return true;
    }
  }
  
  async getAvailableModels(): Promise<string[]> {
    // 미리 정의된 모델이 있으면 반환
    if (this.customConfig.supportedModels) {
      return this.customConfig.supportedModels;
    }
    
    try {
      // OpenAI 호환 모델 엔드포인트 시도
      const url = `${this.customConfig.baseUrl}${this.customConfig.modelsPath}`;
      const headers = this.buildAuthHeaders();
      
      const response = await fetch(url, {
        headers,
        signal: this.createAbortSignal()
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          return data.data.map((model: any) => model.id || model.name);
        }
      }
    } catch {
      // 모델 목록 가져오기 실패
    }
    
    // 기본 모델 반환
    return [this.customConfig.defaultModel || 'default'];
  }
  
  calculateCost(usage: AICompletionResponse['usage'], model: string): number {
    // 커스텀 프로바이더는 비용 계산 불가
    this.log('Cost calculation not available for custom providers');
    return 0;
  }
  
  private buildAuthHeaders(): Record<string, string> {
    const headers = this.buildHeaders();
    
    switch (this.customConfig.authType) {
      case 'bearer':
        headers[this.customConfig.authHeader || 'Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
      case 'apikey':
        headers[this.customConfig.authHeader || 'X-API-Key'] = this.config.apiKey;
        break;
      case 'custom':
        if (this.customConfig.authHeader) {
          headers[this.customConfig.authHeader] = this.config.apiKey;
        }
        break;
    }
    
    return headers;
  }
  
  private messagesToPrompt(messages: AICompletionOptions['messages']): string {
    // 메시지 배열을 단일 프롬프트로 변환
    return messages.map(msg => {
      const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
      return `${role}: ${msg.content}`;
    }).join('\n\n');
  }
  
  private transformResponse(data: any, options: AICompletionOptions): AICompletionResponse {
    if (this.customConfig.apiFormat === 'openai') {
      // OpenAI 호환 응답
      return {
        id: data.id || `custom-${Date.now()}`,
        choices: data.choices?.map((choice: any, index: number) => ({
          index: choice.index ?? index,
          message: {
            role: choice.message?.role || 'assistant',
            content: choice.message?.content || choice.text || ''
          },
          finishReason: this.normalizeFinishReason(choice.finish_reason || 'stop')
        })) || [{
          index: 0,
          message: {
            role: 'assistant',
            content: data.text || data.content || ''
          },
          finishReason: 'stop'
        }],
        usage: {
          promptTokens: data.usage?.prompt_tokens || this.estimateTokens(
            options.messages.map(m => m.content).join(' ')
          ),
          completionTokens: data.usage?.completion_tokens || this.estimateTokens(
            data.choices?.[0]?.message?.content || data.text || ''
          ),
          totalTokens: data.usage?.total_tokens || 0
        },
        model: data.model || options.model || 'custom',
        created: data.created || Math.floor(Date.now() / 1000)
      };
    } else {
      // 커스텀 형식 응답
      const content = data.response || data.text || data.content || data.output || '';
      const promptTokens = this.estimateTokens(
        options.messages.map(m => m.content).join(' ')
      );
      const completionTokens = this.estimateTokens(content);
      
      return {
        id: data.id || `custom-${Date.now()}`,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content
          },
          finishReason: 'stop'
        }],
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens
        },
        model: data.model || options.model || 'custom',
        created: data.created || Math.floor(Date.now() / 1000)
      };
    }
  }
  
  private transformStreamChunk(data: any): AIStreamChunk {
    if (this.customConfig.apiFormat === 'openai') {
      // OpenAI 호환 스트림 청크
      return {
        choices: data.choices?.map((choice: any) => ({
          delta: {
            role: choice.delta?.role,
            content: choice.delta?.content
          },
          index: choice.index || 0,
          finishReason: choice.finish_reason
        })) || []
      };
    } else {
      // 커스텀 스트림 청크
      return {
        choices: [{
          delta: {
            content: data.text || data.content || data.chunk || ''
          },
          index: 0
        }]
      };
    }
  }
  
  private async *parseCustomStream(response: Response): AsyncIterable<AIStreamChunk> {
    // 커스텀 스트림 형식 파싱 (줄 단위 JSON)
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
            let data = this.safeJsonParse<any>(line);
            if (data) {
              if (this.customConfig.responseTransformer) {
                data = this.customConfig.responseTransformer(data);
              }
              yield this.transformStreamChunk(data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  private normalizeFinishReason(reason: string): 'stop' | 'length' | 'function_call' | 'content_filter' {
    const normalized = reason?.toLowerCase();
    if (normalized?.includes('length') || normalized?.includes('max')) {
      return 'length';
    }
    if (normalized?.includes('function')) {
      return 'function_call';
    }
    if (normalized?.includes('filter') || normalized?.includes('safety')) {
      return 'content_filter';
    }
    return 'stop';
  }
}