/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BaseAIAdapter } from '../base-adapter';
import {
  AICompletionOptions,
  AICompletionResponse,
  AIStreamChunk,
  AIMessage,
  MODEL_CONTEXT_LIMITS
} from '@/types/ai-provider';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  metadata?: {
    user_id?: string;
  };
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: string;
  message?: AnthropicResponse;
  index?: number;
  delta?: {
    type: string;
    text?: string;
    stop_reason?: string;
    stop_sequence?: string | null;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicAdapter extends BaseAIAdapter {
  name = 'anthropic';
  
  private modelPricing: Record<string, { prompt: number; completion: number }> = {
    'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
    'claude-3-5-sonnet-20241022': { prompt: 0.003, completion: 0.015 },
    'claude-3-5-sonnet-20240620': { prompt: 0.003, completion: 0.015 },
    'claude-3-sonnet-20240229': { prompt: 0.003, completion: 0.015 },
    'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 }
  };
  
  async complete(options: AICompletionOptions): Promise<AICompletionResponse> {
    this.validateMessages(options.messages);
    
    // 컨텍스트 길이 체크
    const modelLimit = MODEL_CONTEXT_LIMITS[options.model] || 200000;
    this.checkContextLength(options.messages, options.maxTokens || 4096, modelLimit);
    
    return this.withRetry(async () => {
      const anthropicRequest = this.transformRequest(options);
      
      const response = await fetch(
        `${this.config.baseUrl || 'https://api.anthropic.com'}/v1/messages`,
        {
          method: 'POST',
          headers: this.buildHeaders({
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'messages-2023-12-15'
          }),
          body: JSON.stringify(anthropicRequest),
          signal: this.createAbortSignal()
        }
      );
      
      if (!response.ok) {
        await this.handleErrorResponse(response, 'Anthropic');
      }
      
      const data: AnthropicResponse = await response.json();
      return this.transformResponse(data, options);
    });
  }
  
  async *streamComplete(options: AICompletionOptions): AsyncIterable<AIStreamChunk> {
    this.validateMessages(options.messages);
    
    const anthropicRequest = this.transformRequest(options);
    anthropicRequest.stream = true;
    
    const response = await fetch(
      `${this.config.baseUrl || 'https://api.anthropic.com'}/v1/messages`,
      {
        method: 'POST',
        headers: this.buildHeaders({
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'messages-2023-12-15'
        }),
        body: JSON.stringify(anthropicRequest),
        signal: this.createAbortSignal()
      }
    );
    
    if (!response.ok) {
      await this.handleErrorResponse(response, 'Anthropic');
    }
    
    let currentContent = '';
    let messageId = '';
    let promptTokens = 0;
    
    for await (const chunk of this.parseSSEStream(response)) {
      const event = this.safeJsonParse<AnthropicStreamEvent>(chunk);
      if (!event) continue;
      
      switch (event.type) {
        case 'message_start':
          if (event.message) {
            messageId = event.message.id;
            promptTokens = event.message.usage.input_tokens;
          }
          break;
          
        case 'content_block_delta':
          if (event.delta?.text) {
            currentContent += event.delta.text;
            yield {
              choices: [{
                delta: { content: event.delta.text },
                index: 0
              }]
            };
          }
          break;
          
        case 'message_delta':
          if (event.delta?.stop_reason) {
            yield {
              choices: [{
                delta: {},
                index: 0,
                finishReason: this.normalizeFinishReason(event.delta.stop_reason)
              }]
            };
          }
          break;
          
        case 'message_stop':
          // Stream 종료
          break;
      }
    }
  }
  
  async validateApiKey(): Promise<boolean> {
    try {
      // Anthropic은 모델 리스트 API가 없으므로 간단한 메시지로 테스트
      await this.complete({
        model: 'claude-3-haiku-20240307',
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
    // Anthropic은 모델 리스트 API를 제공하지 않으므로 하드코딩
    return [
      'claude-3-opus-20240229',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
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
  
  private transformRequest(options: AICompletionOptions): AnthropicRequest {
    // 시스템 메시지 분리
    const systemMessage = options.messages.find(m => m.role === 'system');
    const otherMessages = options.messages.filter(m => m.role !== 'system');
    
    // Anthropic은 user/assistant 메시지만 허용하고, 첫 메시지는 user여야 함
    const anthropicMessages = this.prepareAnthropicMessages(otherMessages);
    
    const request: AnthropicRequest = {
      model: this.normalizeModelName(options.model),
      messages: anthropicMessages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      top_p: options.topP,
      stop_sequences: options.stop
    };
    
    // 시스템 메시지가 있으면 추가
    if (systemMessage) {
      request.system = systemMessage.content;
    }
    
    // 사용자 ID가 있으면 메타데이터에 추가
    if (options.user) {
      request.metadata = { user_id: options.user };
    }
    
    return request;
  }
  
  private prepareAnthropicMessages(messages: AIMessage[]): AnthropicMessage[] {
    const anthropicMessages: AnthropicMessage[] = [];
    
    for (const msg of messages) {
      if (msg.role === 'system') continue; // 시스템 메시지는 이미 처리됨
      
      // user 또는 assistant 역할만 허용
      const role = msg.role === 'assistant' ? 'assistant' : 'user';
      
      anthropicMessages.push({
        role,
        content: msg.content
      });
    }
    
    // Anthropic은 첫 메시지가 user여야 함
    if (anthropicMessages.length > 0 && anthropicMessages[0].role !== 'user') {
      anthropicMessages.unshift({
        role: 'user',
        content: 'Continue the conversation.'
      });
    }
    
    // 연속된 같은 역할의 메시지 병합
    const mergedMessages: AnthropicMessage[] = [];
    let lastRole: string | null = null;
    let contentBuffer = '';
    
    for (const msg of anthropicMessages) {
      if (msg.role === lastRole) {
        contentBuffer += '\n\n' + msg.content;
      } else {
        if (lastRole !== null) {
          mergedMessages.push({
            role: lastRole as 'user' | 'assistant',
            content: contentBuffer
          });
        }
        lastRole = msg.role;
        contentBuffer = msg.content;
      }
    }
    
    if (lastRole !== null) {
      mergedMessages.push({
        role: lastRole as 'user' | 'assistant',
        content: contentBuffer
      });
    }
    
    return mergedMessages;
  }
  
  private transformResponse(data: AnthropicResponse, options: AICompletionOptions): AICompletionResponse {
    // 토큰 사용량 계산
    const promptTokens = data.usage?.input_tokens || this.estimateTokens(
      options.messages.map(m => m.content).join(' ')
    );
    const completionTokens = data.usage?.output_tokens || this.estimateTokens(
      data.content[0]?.text || ''
    );
    
    return {
      id: data.id,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.content[0]?.text || ''
        },
        finishReason: this.normalizeFinishReason(data.stop_reason)
      }],
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens
      },
      model: data.model,
      created: Math.floor(Date.now() / 1000)
    };
  }
  
  private normalizeFinishReason(reason: string): 'stop' | 'length' | 'function_call' | 'content_filter' {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      default:
        return 'stop';
    }
  }
  
  protected normalizeModelName(model: string): string {
    // 간략한 이름을 정식 이름으로 변환
    const modelAliases: Record<string, string> = {
      'claude-3-opus': 'claude-3-opus-20240229',
      'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
      'claude-3-sonnet': 'claude-3-sonnet-20240229',
      'claude-3-haiku': 'claude-3-haiku-20240307',
      'opus': 'claude-3-opus-20240229',
      'sonnet': 'claude-3-5-sonnet-20241022',
      'haiku': 'claude-3-haiku-20240307'
    };
    
    return modelAliases[model] || model;
  }
  
  // Anthropic 특화 기능
  async generateXMLResponse(
    prompt: string,
    xmlSchema: string,
    model = 'claude-3-5-sonnet-20241022'
  ): Promise<string> {
    const systemPrompt = `You are an AI assistant that responds in valid XML format according to the provided schema.
    
XML Schema:
${xmlSchema}

Important: Your entire response must be valid XML that conforms to the schema above.`;
    
    const response = await this.complete({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0
    });
    
    return response.choices[0].message.content;
  }
}