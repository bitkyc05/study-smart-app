import { BaseAIAdapter } from '../base-adapter';
import {
  AICompletionOptions,
  AICompletionResponse,
  AIStreamChunk,
  AIProviderError,
  MODEL_CONTEXT_LIMITS
} from '@/types/ai-provider';

interface OpenAIError {
  error?: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
    };
    finish_reason: string | null;
  }>;
}

export class OpenAIAdapter extends BaseAIAdapter {
  name = 'openai';
  
  private modelPricing: Record<string, { prompt: number; completion: number }> = {
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-4-turbo-2024-04-09': { prompt: 0.01, completion: 0.03 },
    'gpt-4-turbo-preview': { prompt: 0.01, completion: 0.03 },
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-32k': { prompt: 0.06, completion: 0.12 },
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
    'gpt-3.5-turbo-16k': { prompt: 0.003, completion: 0.004 },
    'gpt-4o': { prompt: 0.005, completion: 0.015 },
    'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 }
  };
  
  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    this.validateMessages(options.messages);
    
    // 컨텍스트 길이 체크
    const modelLimit = MODEL_CONTEXT_LIMITS[options.model] || 4096;
    this.checkContextLength(options.messages, options.maxTokens || 0, modelLimit);
    
    return this.withRetry(async () => {
      const response = await fetch(
        `${this.config.baseUrl || 'https://api.openai.com'}/v1/chat/completions`,
        {
          method: 'POST',
          headers: this.buildHeaders({
            'Authorization': `Bearer ${this.config.apiKey}`,
            ...(this.config.organization && {
              'OpenAI-Organization': this.config.organization
            })
          }),
          body: JSON.stringify({
            model: options.model,
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
          }),
          signal: this.createAbortSignal()
        }
      );
      
      if (!response.ok) {
        await this.handleErrorResponse(response, 'OpenAI');
      }
      
      const data: OpenAICompletionResponse = await response.json();
      return this.transformResponse(data);
    });
  }
  
  async *streamComplete(options: AICompletionOptions): AsyncIterable<AIStreamChunk> {
    this.validateMessages(options.messages);
    
    const response = await fetch(
      `${this.config.baseUrl || 'https://api.openai.com'}/v1/chat/completions`,
      {
        method: 'POST',
        headers: this.buildHeaders({
          'Authorization': `Bearer ${this.config.apiKey}`,
          ...(this.config.organization && {
            'OpenAI-Organization': this.config.organization
          })
        }),
        body: JSON.stringify({
          model: options.model,
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
        }),
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'OpenAI');
    }
    
    for await (const chunk of this.parseSSEStream(response)) {
      const data = this.safeJsonParse<OpenAIStreamChunk>(chunk);
      if (data) {
        yield this.transformStreamChunk(data);
      }
    }
  }
  
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.baseUrl || 'https://api.openai.com'}/v1/models`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            ...(this.config.organization && {
              'OpenAI-Organization': this.config.organization
            })
          },
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
      `${this.config.baseUrl || 'https://api.openai.com'}/v1/models`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          ...(this.config.organization && {
            'OpenAI-Organization': this.config.organization
          })
        },
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'OpenAI');
    }
    
    const data = await response.json();
    return data.data
      .filter((model: any) => 
        model.id.includes('gpt') && 
        !model.id.includes('instruct') &&
        !model.id.includes('0125') && // 이전 버전 필터링
        !model.id.includes('0314') &&
        !model.id.includes('0613')
      )
      .map((model: any) => model.id)
      .sort();
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
  
  // OpenAI 특화 기능
  async embedText(text: string, model = 'text-embedding-3-small'): Promise<number[]> {
    const response = await fetch(
      `${this.config.baseUrl || 'https://api.openai.com'}/v1/embeddings`,
      {
        method: 'POST',
        headers: this.buildHeaders({
          'Authorization': `Bearer ${this.config.apiKey}`
        }),
        body: JSON.stringify({
          input: text,
          model
        }),
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'OpenAI');
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  }
  
  async generateImage(prompt: string, options?: {
    model?: string;
    n?: number;
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
  }): Promise<string> {
    const response = await fetch(
      `${this.config.baseUrl || 'https://api.openai.com'}/v1/images/generations`,
      {
        method: 'POST',
        headers: this.buildHeaders({
          'Authorization': `Bearer ${this.config.apiKey}`
        }),
        body: JSON.stringify({
          prompt,
          model: options?.model || 'dall-e-3',
          n: options?.n || 1,
          size: options?.size || '1024x1024',
          quality: options?.quality || 'standard',
          style: options?.style || 'vivid'
        }),
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'OpenAI');
    }
    
    const data = await response.json();
    return data.data[0].url;
  }
  
  async transcribeAudio(audio: Blob, options?: {
    model?: string;
    language?: string;
    prompt?: string;
    temperature?: number;
  }): Promise<string> {
    const formData = new FormData();
    formData.append('file', audio, 'audio.wav');
    formData.append('model', options?.model || 'whisper-1');
    
    if (options?.language) formData.append('language', options.language);
    if (options?.prompt) formData.append('prompt', options.prompt);
    if (options?.temperature !== undefined) {
      formData.append('temperature', options.temperature.toString());
    }
    
    const response = await fetch(
      `${this.config.baseUrl || 'https://api.openai.com'}/v1/audio/transcriptions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
          // Content-Type 헤더는 FormData가 자동으로 설정
        },
        body: formData,
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'OpenAI');
    }
    
    const data = await response.json();
    return data.text;
  }
  
  private transformResponse(data: OpenAICompletionResponse): AICompletionResponse {
    return {
      id: data.id,
      choices: data.choices.map((choice) => ({
        index: choice.index,
        message: {
          role: choice.message.role as 'user' | 'assistant' | 'system',
          content: choice.message.content,
          functionCall: choice.message.function_call
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
  
  private transformStreamChunk(data: OpenAIStreamChunk): AIStreamChunk {
    return {
      choices: data.choices.map((choice) => ({
        delta: {
          role: choice.delta.role as 'user' | 'assistant' | 'system' | undefined,
          content: choice.delta.content,
          functionCall: choice.delta.function_call
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
        return 'length';
      case 'function_call':
        return 'function_call';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
  
  protected normalizeModelName(model: string): string {
    // 간략한 이름을 정식 이름으로 변환
    const modelAliases: Record<string, string> = {
      'gpt-4': 'gpt-4',
      'gpt-4-turbo': 'gpt-4-turbo-preview',
      'gpt-3.5': 'gpt-3.5-turbo',
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini'
    };
    
    return modelAliases[model] || model;
  }
}