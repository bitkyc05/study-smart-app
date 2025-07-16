import { AIProvider, AIProviderConfig, ProviderType } from '@/types/ai-provider';
import { OpenAIAdapter } from './adapters/openai-adapter';
import { AnthropicAdapter } from './adapters/anthropic-adapter';
import { GoogleAdapter } from './adapters/google-adapter';
import { GrokAdapter } from './adapters/grok-adapter';
import { CustomAdapter } from './adapters/custom-adapter';
import { createClient } from '@/lib/supabase/server';

// Provider 인스턴스 캐시
interface CachedProvider {
  provider: AIProvider;
  lastAccessed: number;
}

export class AIProviderFactory {
  private static instances: Map<string, CachedProvider> = new Map();
  private static maxCacheAge = 1000 * 60 * 60; // 1시간
  private static maxCacheSize = 50; // 최대 캐시 크기
  
  /**
   * AI Provider 인스턴스 생성
   */
  static create(
    type: ProviderType,
    config: AIProviderConfig
  ): AIProvider {
    const key = `${type}-${config.apiKey}`;
    
    // 캐시에서 확인
    const cached = this.instances.get(key);
    if (cached && (Date.now() - cached.lastAccessed) < this.maxCacheAge) {
      cached.lastAccessed = Date.now();
      return cached.provider;
    }
    
    // 새 인스턴스 생성
    let provider: AIProvider;
    
    switch (type) {
      case 'openai':
        provider = new OpenAIAdapter(config);
        break;
      case 'anthropic':
        provider = new AnthropicAdapter(config);
        break;
      case 'google':
        provider = new GoogleAdapter(config);
        break;
      case 'grok':
        provider = new GrokAdapter(config);
        break;
      case 'custom':
        provider = new CustomAdapter(config);
        break;
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
    
    // 캐시에 저장
    this.addToCache(key, provider);
    
    return provider;
  }
  
  /**
   * 사용자 ID와 프로바이더 타입으로 AI Provider 생성
   */
  static async createForUser(
    userId: string,
    providerType: ProviderType
  ): Promise<AIProvider> {
    const supabase = await createClient();
    
    // user_api_keys 테이블에서 API 키 정보 조회
    const { data: keyData, error } = await supabase
      .from('user_api_keys')
      .select('id, provider, is_active, custom_url')
      .eq('user_id', userId)
      .eq('provider', providerType)
      .eq('is_active', true)
      .single();
    
    if (error || !keyData) {
      throw new Error(`No active API key found for provider: ${providerType}`);
    }
    
    // API 키 복호화 (별도 함수로 구현 필요)
    const apiKey = await this.getDecryptedApiKey(keyData.id, userId);
    
    const config: AIProviderConfig = {
      apiKey,
      baseUrl: keyData.custom_url || undefined
    };
    
    return this.create(providerType, config);
  }
  
  /**
   * 캐시 관리
   */
  private static addToCache(key: string, provider: AIProvider): void {
    // 캐시 크기 제한
    if (this.instances.size >= this.maxCacheSize) {
      // 가장 오래된 항목 제거
      let oldestKey = '';
      let oldestTime = Date.now();
      
      for (const [k, v] of this.instances.entries()) {
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.instances.delete(oldestKey);
      }
    }
    
    this.instances.set(key, {
      provider,
      lastAccessed: Date.now()
    });
  }
  
  /**
   * 캐시 초기화
   */
  static clearCache(): void {
    this.instances.clear();
  }
  
  /**
   * 특정 프로바이더의 캐시 제거
   */
  static removeFromCache(type: ProviderType, apiKey: string): void {
    const key = `${type}-${apiKey}`;
    this.instances.delete(key);
  }
  
  /**
   * 암호화된 API 키 복호화
   */
  private static async getDecryptedApiKey(keyId: string, userId: string): Promise<string> {
    const supabase = await createClient();
    
    // Supabase의 Vault나 pgsodium을 사용하여 복호화
    // 실제 구현은 프로젝트의 암호화 방식에 따라 다름
    const { data, error } = await supabase.rpc('decrypt_api_key', {
      p_key_id: keyId,
      p_user_id: userId
    });
    
    if (error || !data) {
      throw new Error('Failed to decrypt API key');
    }
    
    return data;
  }
  
  /**
   * 프로바이더 설정 검증
   */
  static async validateProviderConfig(
    type: ProviderType,
    config: AIProviderConfig
  ): Promise<boolean> {
    try {
      const provider = this.create(type, config);
      return await provider.validateApiKey();
    } catch {
      return false;
    }
  }
  
  /**
   * 사용 가능한 모든 프로바이더 목록
   */
  static getAvailableProviders(): ProviderType[] {
    return ['openai', 'anthropic', 'google', 'grok', 'custom'];
  }
  
  /**
   * 프로바이더별 기본 설정
   */
  static getDefaultConfig(type: ProviderType): Partial<AIProviderConfig> {
    switch (type) {
      case 'openai':
        return {
          baseUrl: 'https://api.openai.com',
          defaultModel: 'gpt-4o-mini',
          timeout: 30000,
          maxRetries: 3
        };
      case 'anthropic':
        return {
          baseUrl: 'https://api.anthropic.com',
          defaultModel: 'claude-3-haiku-20240307',
          timeout: 30000,
          maxRetries: 3
        };
      case 'google':
        return {
          baseUrl: 'https://generativelanguage.googleapis.com',
          defaultModel: 'gemini-1.5-flash',
          timeout: 30000,
          maxRetries: 3
        };
      case 'grok':
        return {
          baseUrl: 'https://api.x.ai',
          defaultModel: 'grok-1',
          timeout: 30000,
          maxRetries: 3
        };
      case 'custom':
        return {
          timeout: 30000,
          maxRetries: 3
        };
      default:
        return {
          timeout: 30000,
          maxRetries: 3
        };
    }
  }
  
  /**
   * 프로바이더 정보 가져오기
   */
  static getProviderInfo(type: ProviderType): {
    name: string;
    description: string;
    features: string[];
    limitations: string[];
  } {
    const info = {
      openai: {
        name: 'OpenAI',
        description: 'OpenAI GPT models including GPT-4 and GPT-3.5',
        features: ['Function calling', 'JSON mode', 'Vision', 'Audio transcription', 'Embeddings'],
        limitations: ['Rate limits apply', 'Maximum context varies by model']
      },
      anthropic: {
        name: 'Anthropic',
        description: 'Claude models with strong reasoning and safety',
        features: ['Large context window', 'XML generation', 'Vision support'],
        limitations: ['No function calling', 'No built-in embeddings']
      },
      google: {
        name: 'Google Gemini',
        description: 'Google\'s multimodal AI models',
        features: ['Huge context window', 'Multimodal', 'JSON mode', 'Embeddings'],
        limitations: ['Different API structure', 'Character-based pricing']
      },
      grok: {
        name: 'Grok',
        description: 'X.AI\'s model with real-time information',
        features: ['Real-time data', 'X integration'],
        limitations: ['Limited features', 'Smaller context window']
      },
      custom: {
        name: 'Custom Provider',
        description: 'Connect to any OpenAI-compatible API',
        features: ['Flexible configuration', 'Self-hosted support'],
        limitations: ['Features depend on implementation']
      }
    };
    
    return info[type] || {
      name: type,
      description: 'Unknown provider',
      features: [],
      limitations: []
    };
  }
}

// Helper functions for common use cases

/**
 * 빠른 프로바이더 생성 (API 키 직접 제공)
 */
export function createProvider(
  type: ProviderType,
  apiKey: string,
  options?: Partial<AIProviderConfig>
): AIProvider {
  const defaultConfig = AIProviderFactory.getDefaultConfig(type);
  
  return AIProviderFactory.create(type, {
    ...defaultConfig,
    ...options,
    apiKey
  });
}

/**
 * 사용자용 프로바이더 생성 (DB에서 API 키 조회)
 */
export async function createUserProvider(
  userId: string,
  providerType: ProviderType
): Promise<AIProvider> {
  return AIProviderFactory.createForUser(userId, providerType);
}

/**
 * 프로바이더 검증
 */
export async function validateProvider(
  type: ProviderType,
  apiKey: string,
  baseUrl?: string
): Promise<boolean> {
  return AIProviderFactory.validateProviderConfig(type, {
    apiKey,
    baseUrl
  });
}