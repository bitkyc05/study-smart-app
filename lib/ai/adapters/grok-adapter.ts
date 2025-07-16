/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseAIAdapter } from '../base-adapter';
import {
  AICompletionOptions,
  AICompletionResponse,
  AIStreamChunk,
  AIMessage,
  MODEL_CONTEXT_LIMITS
} from '@/types/ai-provider';

interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GrokRequest {
  messages: GrokMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  stream?: boolean;
  user?: string;
}

interface GrokResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface GrokStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export class GrokAdapter extends BaseAIAdapter {
  name = 'grok';
  
  // Grok의 가격 정보는 공개되지 않았으므로 예상 가격 사용
  private modelPricing: Record<string, { prompt: number; completion: number }> = {
    'grok-1': { prompt: 0.005, completion: 0.015 },
    'grok-2': { prompt: 0.01, completion: 0.03 },
    'grok-2-advanced': { prompt: 0.015, completion: 0.045 }
  };
  
  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    this.validateMessages(options.messages);
    
    // 컨텍스트 길이 체크
    const modelLimit = MODEL_CONTEXT_LIMITS[options.model] || 8192;
    this.checkContextLength(options.messages, options.maxTokens || 0, modelLimit);
    
    return this.withRetry(async () => {
      const grokRequest: GrokRequest = {
        model: this.normalizeModelName(options.model),
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stop,
        stream: false,
        user: options.user
      };
      
      const response = await fetch(
        `${this.config.baseUrl || 'https://api.x.ai'}/v1/chat/completions`,
        {
          method: 'POST',
          headers: this.buildHeaders({
            'Authorization': `Bearer ${this.config.apiKey}`
          }),
          body: JSON.stringify(grokRequest),
          signal: this.createAbortSignal()
        }
      );
      
      if (!response.ok) {
        await this.handleErrorResponse(response, 'Grok');
      }
      
      const data: GrokResponse = await response.json();
      return this.transformResponse(data);
    });
  }
  
  async *streamComplete(options: AICompletionOptions): AsyncIterable<AIStreamChunk> {
    this.validateMessages(options.messages);
    
    const grokRequest: GrokRequest = {
      model: this.normalizeModelName(options.model),
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stop,
      stream: true,
      user: options.user
    };
    
    const response = await fetch(
      `${this.config.baseUrl || 'https://api.x.ai'}/v1/chat/completions`,
      {
        method: 'POST',
        headers: this.buildHeaders({
          'Authorization': `Bearer ${this.config.apiKey}`
        }),
        body: JSON.stringify(grokRequest),
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'Grok');
    }
    
    for await (const chunk of this.parseSSEStream(response)) {
      const data = this.safeJsonParse<GrokStreamChunk>(chunk);
      if (data) {
        yield this.transformStreamChunk(data);
      }
    }
  }
  
  async validateApiKey(): Promise<boolean> {
    try {
      // Grok API 검증을 위한 간단한 요청
      await this.complete({
        model: 'grok-1',
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 1
      });
      return true;
    } catch (error: any) {
      // 401 에러가 아닌 경우는 API 키는 유효함
      return error.status !== 401;
    }
  }
  
  async getAvailableModels(): Promise<string[]> {
    // Grok는 모델 리스트 API를 제공하지 않으므로 하드코딩
    return [
      'grok-1',
      'grok-2',
      'grok-2-advanced'
    ];
  }
  
  calculateCost(usage: AICompletionResponse['usage'], model: string): number {
    const pricing = this.modelPricing[model];
    if (!pricing) {
      this.log(`No pricing information for model: ${model}`);
      return 0;
    }
    
    const promptCost = (usage.promptTokens / 1000) * pricing.prompt;
    const completionCost = (usage.completionTokens / 1000) * pricing.completion;
    
    return promptCost + completionCost;
  }
  
  private transformResponse(data: GrokResponse): AICompletionResponse {
    return {
      id: data.id,
      choices: data.choices.map((choice) => ({
        index: choice.index,
        message: {
          role: choice.message.role as 'user' | 'assistant' | 'system',
          content: choice.message.content
        },
        finishReason: this.normalizeFinishReason(choice.finish_reason)
      })),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      },
      model: data.model,
      created: data.created
    };
  }
  
  private transformStreamChunk(data: GrokStreamChunk): AIStreamChunk {
    return {
      choices: data.choices.map((choice) => ({
        delta: {
          role: choice.delta.role as 'user' | 'assistant' | 'system' | undefined,
          content: choice.delta.content
        },
        index: choice.index,
        finishReason: choice.finish_reason || undefined
      }))
    };
  }
  
  private normalizeFinishReason(reason: string): 'stop' | 'length' | 'function_call' | 'content_filter' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
      case 'max_tokens':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
  
  protected normalizeModelName(model: string): string {
    // 간략한 이름을 정식 이름으로 변환
    const modelAliases: Record<string, string> = {
      'grok': 'grok-1',
      'grok2': 'grok-2',
      'grok-advanced': 'grok-2-advanced'
    };
    
    return modelAliases[model] || model;
  }
  
  // Grok 특화 기능
  async searchXPosts(
    query: string,
    options?: {
      limit?: number;
      timeRange?: 'recent' | 'today' | 'week' | 'month';
      includeReplies?: boolean;
    }
  ): Promise<any[]> {
    // X (Twitter) 포스트 검색 기능
    // 실제 구현은 X API와의 통합이 필요
    const searchParams = new URLSearchParams({
      q: query,
      limit: (options?.limit || 10).toString(),
      time_range: options?.timeRange || 'recent',
      include_replies: (options?.includeReplies || false).toString()
    });
    
    const response = await fetch(
      `${this.config.baseUrl || 'https://api.x.ai'}/v1/search/posts?${searchParams}`,
      {
        headers: this.buildHeaders({
          'Authorization': `Bearer ${this.config.apiKey}`
        }),
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'Grok');
    }
    
    const data = await response.json();
    return data.posts;
  }
  
  async analyzeXTrends(
    options?: {
      location?: string;
      category?: string;
      limit?: number;
    }
  ): Promise<any[]> {
    // X 트렌드 분석 기능
    const params = new URLSearchParams();
    if (options?.location) params.append('location', options.location);
    if (options?.category) params.append('category', options.category);
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const response = await fetch(
      `${this.config.baseUrl || 'https://api.x.ai'}/v1/trends?${params}`,
      {
        headers: this.buildHeaders({
          'Authorization': `Bearer ${this.config.apiKey}`
        }),
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'Grok');
    }
    
    const data = await response.json();
    return data.trends;
  }
  
  async generateWithRealtimeContext(
    prompt: string,
    options?: AICompletionOptions
  ): Promise<AICompletionResponse> {
    // 실시간 컨텍스트를 포함한 생성
    const systemPrompt = `You have access to real-time information from X (Twitter) and the internet. 
    Use this information to provide current and accurate responses.
    Current date and time: ${new Date().toISOString()}`;
    
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];
    
    if (options?.messages) {
      messages.push(...options.messages);
    }
    
    return this.complete({
      ...options,
      model: options?.model || 'grok-2',
      messages
    });
  }
}