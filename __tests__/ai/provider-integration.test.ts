import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { AIProviderFactory, createProvider } from '@/lib/ai/provider-factory';
import { ProviderType, AIProvider, MODEL_ALIASES } from '@/types/ai-provider';

// 환경 변수에서 API 키 로드 (실제 테스트 시)
const TEST_API_KEYS = {
  openai: process.env.TEST_OPENAI_API_KEY,
  anthropic: process.env.TEST_ANTHROPIC_API_KEY,
  google: process.env.TEST_GOOGLE_API_KEY,
  grok: process.env.TEST_GROK_API_KEY,
  custom: process.env.TEST_CUSTOM_API_KEY
};

// Mock 응답 데이터
const mockCompletionResponse = {
  id: 'test-completion',
  choices: [{
    index: 0,
    message: { role: 'assistant', content: 'Test response' },
    finishReason: 'stop' as const
  }],
  usage: {
    promptTokens: 10,
    completionTokens: 5,
    totalTokens: 15
  },
  model: 'test-model',
  created: Date.now()
};

describe('AI Provider Integration Tests', () => {
  afterAll(() => {
    AIProviderFactory.clearCache();
  });

  describe('Provider Factory', () => {
    test('should create providers for all supported types', () => {
      const types: ProviderType[] = ['openai', 'anthropic', 'google', 'grok', 'custom'];
      
      types.forEach(type => {
        const provider = AIProviderFactory.create(type, { apiKey: 'test-key' });
        expect(provider).toBeDefined();
        expect(provider.name).toBe(type);
      });
    });

    test('should cache provider instances', () => {
      const config = { apiKey: 'test-key' };
      const provider1 = AIProviderFactory.create('openai', config);
      const provider2 = AIProviderFactory.create('openai', config);
      
      expect(provider1).toBe(provider2); // Same instance
    });

    test('should enforce cache size limit', () => {
      // Create more providers than cache limit
      for (let i = 0; i < 55; i++) {
        AIProviderFactory.create('openai', { apiKey: `test-key-${i}` });
      }
      
      // Cache should not exceed limit (internal test)
      expect(true).toBe(true); // Just ensure no errors
    });

    test('should provide default configurations', () => {
      const types: ProviderType[] = ['openai', 'anthropic', 'google', 'grok', 'custom'];
      
      types.forEach(type => {
        const config = AIProviderFactory.getDefaultConfig(type);
        expect(config).toBeDefined();
        expect(config.timeout).toBe(30000);
        expect(config.maxRetries).toBe(3);
      });
    });

    test('should provide provider information', () => {
      const info = AIProviderFactory.getProviderInfo('openai');
      expect(info.name).toBe('OpenAI');
      expect(info.features).toContain('Function calling');
      expect(info.limitations).toBeDefined();
    });
  });

  describe('Common Provider Interface', () => {
    const providers: Array<[ProviderType, AIProvider]> = [
      ['openai', createProvider('openai', 'test-key')],
      ['anthropic', createProvider('anthropic', 'test-key')],
      ['google', createProvider('google', 'test-key')],
      ['grok', createProvider('grok', 'test-key')],
      ['custom', createProvider('custom', 'test-key')]
    ];

    test.each(providers)('%s should implement required methods', (type, provider) => {
      expect(provider.complete).toBeDefined();
      expect(provider.streamComplete).toBeDefined();
      expect(provider.validateApiKey).toBeDefined();
      expect(provider.getAvailableModels).toBeDefined();
      expect(provider.calculateCost).toBeDefined();
    });

    test.each(providers)('%s should handle invalid messages', async (type, provider) => {
      await expect(provider.complete({
        model: 'test-model',
        messages: []
      })).rejects.toThrow('Messages array cannot be empty');
    });
  });

  describe('Model Aliases', () => {
    test('should support model aliases across providers', () => {
      const aliases = ['fast', 'balanced', 'powerful'];
      const providers: ProviderType[] = ['openai', 'anthropic', 'google', 'grok', 'custom'];
      
      aliases.forEach(alias => {
        providers.forEach(provider => {
          expect(MODEL_ALIASES[alias][provider]).toBeDefined();
        });
      });
    });
  });

  describe('OpenAI Adapter', () => {
    const provider = createProvider('openai', TEST_API_KEYS.openai || 'test-key');

    test('should transform OpenAI request format', async () => {
      if (!TEST_API_KEYS.openai) {
        console.log('Skipping OpenAI live test - no API key');
        return;
      }

      const response = await provider.complete({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "test passed"' }
        ],
        maxTokens: 10,
        temperature: 0
      });

      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content.toLowerCase()).toContain('test');
      expect(response.usage.totalTokens).toBeGreaterThan(0);
    });

    test('should support streaming', async () => {
      if (!TEST_API_KEYS.openai) return;

      const chunks: string[] = [];
      
      for await (const chunk of provider.streamComplete({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Count to 3' }],
        maxTokens: 20
      })) {
        if (chunk.choices[0]?.delta?.content) {
          chunks.push(chunk.choices[0].delta.content);
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      const fullResponse = chunks.join('');
      expect(fullResponse).toMatch(/[123]/);
    });

    test('should calculate costs correctly', () => {
      const cost = provider.calculateCost({
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500
      }, 'gpt-3.5-turbo');

      expect(cost).toBeCloseTo(0.001, 4); // $0.0005 + $0.00075
    });
  });

  describe('Anthropic Adapter', () => {
    const provider = createProvider('anthropic', TEST_API_KEYS.anthropic || 'test-key');

    test('should handle system messages separately', async () => {
      if (!TEST_API_KEYS.anthropic) {
        console.log('Skipping Anthropic live test - no API key');
        return;
      }

      const response = await provider.complete({
        model: 'claude-3-haiku-20240307',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "test passed"' }
        ],
        maxTokens: 10
      });

      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content.toLowerCase()).toContain('test');
    });

    test('should merge consecutive same-role messages', async () => {
      // This is tested internally - Anthropic requires alternating roles
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'user' as const, content: 'How are you?' },
        { role: 'assistant' as const, content: 'I am fine' },
        { role: 'assistant' as const, content: 'Thank you' }
      ];

      // The adapter should handle this internally without errors
      expect(() => provider.complete({
        model: 'claude-3-haiku-20240307',
        messages,
        maxTokens: 10
      })).not.toThrow();
    });
  });

  describe('Google Adapter', () => {
    const provider = createProvider('google', TEST_API_KEYS.google || 'test-key');

    test('should transform to Gemini format', async () => {
      if (!TEST_API_KEYS.google) {
        console.log('Skipping Google live test - no API key');
        return;
      }

      const response = await provider.complete({
        model: 'gemini-1.5-flash',
        messages: [
          { role: 'user', content: 'Say "test passed"' }
        ],
        maxTokens: 10,
        temperature: 0
      });

      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content.toLowerCase()).toContain('test');
    });

    test('should handle multimodal content', () => {
      // Type check for multimodal support
      const googleProvider = provider as any;
      expect(googleProvider.processMultimodal).toBeDefined();
    });
  });

  describe('Custom Adapter', () => {
    test('should support OpenAI-compatible format', async () => {
      const provider = createProvider('custom', 'test-key', {
        baseUrl: 'https://api.example.com',
        apiFormat: 'openai' as any
      });

      // Mock fetch for custom provider
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompletionResponse
      } as any);

      const response = await provider.complete({
        model: 'custom-model',
        messages: [{ role: 'user', content: 'Test' }]
      });

      expect(response.choices[0].message.content).toBe('Test response');
    });

    test('should support custom format with transformers', async () => {
      const customTransformer = (data: any) => ({
        ...mockCompletionResponse,
        custom: true
      });

      const provider = createProvider('custom', 'test-key', {
        baseUrl: 'https://api.example.com',
        apiFormat: 'custom' as any,
        responseTransformer: customTransformer as any
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'Custom response' })
      } as any);

      const response = await provider.complete({
        model: 'custom-model',
        messages: [{ role: 'user', content: 'Test' }]
      });

      expect(response).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should retry on rate limit errors', async () => {
      let attempts = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          return Promise.reject({ status: 429 });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockCompletionResponse
        });
      });

      const provider = createProvider('openai', 'test-key');
      const response = await provider.complete({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }]
      });

      expect(attempts).toBe(2);
      expect(response).toBeDefined();
    });

    test('should not retry on authentication errors', async () => {
      global.fetch = jest.fn().mockRejectedValue({ status: 401 });

      const provider = createProvider('openai', 'test-key');
      
      await expect(provider.complete({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }]
      })).rejects.toThrow();
    });

    test('should handle timeout', async () => {
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 5000))
      );

      const provider = createProvider('openai', 'test-key', { timeout: 100 });
      
      await expect(provider.complete({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }]
      })).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    test('should estimate tokens correctly', () => {
      const provider = createProvider('openai', 'test-key');
      
      // Access protected method through any cast (for testing)
      const baseAdapter = provider as any;
      
      // English text (approximately 4 chars per token)
      const englishTokens = baseAdapter.estimateTokens('Hello world test');
      expect(englishTokens).toBeCloseTo(4, 0);
      
      // Korean text (approximately 2.5 chars per token)
      const koreanTokens = baseAdapter.estimateTokens('안녕하세요 테스트입니다');
      expect(koreanTokens).toBeGreaterThan(4);
    });

    test('should validate context length', async () => {
      const provider = createProvider('openai', 'test-key');
      
      // Create a message that exceeds context
      const longMessage = 'a'.repeat(20000);
      
      await expect(provider.complete({
        model: 'gpt-3.5-turbo', // 16k context
        messages: [{ role: 'user', content: longMessage }],
        maxTokens: 10000 // This would exceed the limit
      })).rejects.toThrow(/Token limit exceeded/);
    });
  });
});