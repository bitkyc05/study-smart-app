import { SupabaseClient } from '@supabase/supabase-js';

export interface APIKeyMetadata {
  id: string;
  provider: string;
  encrypted_hint: string;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  usage_count: number;
  custom_url: string | null;
  created_at: string;
}

export interface StoreKeyResult {
  success: boolean;
  error?: string;
  keyId?: string;
}

export interface ValidateKeyResult {
  valid: boolean;
  error?: string;
}

export class APIKeyService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Store an API key securely in the vault
   */
  async storeKey(
    userId: string,
    provider: string,
    apiKey: string,
    customUrl?: string
  ): Promise<StoreKeyResult> {
    try {
      // Validate key first
      const validation = await this.validateKey(provider, apiKey, customUrl);
      if (!validation.valid) {
        return { 
          success: false, 
          error: validation.error || 'Invalid API key' 
        };
      }

      // Store in vault using RPC function
      const { data, error } = await this.supabase.rpc('store_api_key', {
        p_user_id: userId,
        p_provider: provider,
        p_api_key: apiKey,
        p_custom_url: customUrl || null
      });

      if (error) {
        console.error('Error storing API key:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }

      return { 
        success: true,
        keyId: data
      };
    } catch (error) {
      console.error('Error in storeKey:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get decrypted API key from vault
   */
  async getKey(
    userId: string,
    provider: string
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_decrypted_api_key', {
        p_user_id: userId,
        p_provider: provider
      });

      if (error) {
        console.error('Error getting API key:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getKey:', error);
      return null;
    }
  }

  /**
   * Get all API key metadata for a user
   */
  async getUserKeys(userId: string): Promise<APIKeyMetadata[]> {
    try {
      const { data, error } = await this.supabase
        .from('api_key_metadata')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting user keys:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserKeys:', error);
      return [];
    }
  }

  /**
   * Delete an API key
   */
  async deleteKey(
    userId: string,
    provider: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('delete_api_key', {
        p_user_id: userId,
        p_provider: provider
      });

      if (error) {
        console.error('Error deleting API key:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error in deleteKey:', error);
      return false;
    }
  }

  /**
   * Validate an API key with the provider
   */
  async validateKey(
    provider: string,
    apiKey: string,
    customUrl?: string
  ): Promise<ValidateKeyResult> {
    try {
      const validators: Record<string, () => Promise<ValidateKeyResult>> = {
        openai: () => this.validateOpenAI(apiKey),
        anthropic: () => this.validateAnthropic(apiKey),
        google: () => this.validateGoogle(apiKey),
        grok: () => this.validateGrok(apiKey),
        custom: () => this.validateCustom(apiKey, customUrl)
      };

      const validator = validators[provider];
      if (!validator) {
        return { 
          valid: false, 
          error: 'Unknown provider' 
        };
      }

      return await validator();
    } catch (error) {
      console.error('Error validating key:', error);
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Validation failed' 
      };
    }
  }

  /**
   * Validate OpenAI API key
   */
  private async validateOpenAI(apiKey: string): Promise<ValidateKeyResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 401) {
        return { 
          valid: false, 
          error: 'Invalid API key' 
        };
      }

      return { 
        valid: false, 
        error: `API returned status ${response.status}` 
      };
    } catch {
      return { 
        valid: false, 
        error: 'Failed to connect to OpenAI' 
      };
    }
  }

  /**
   * Validate Anthropic API key
   */
  private async validateAnthropic(apiKey: string): Promise<ValidateKeyResult> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1
        })
      });

      // 401 means invalid key, other errors might be rate limits etc
      if (response.status === 401) {
        return { 
          valid: false, 
          error: 'Invalid API key' 
        };
      }

      // Any other response means the key is valid
      return { valid: true };
    } catch {
      return { 
        valid: false, 
        error: 'Failed to connect to Anthropic' 
      };
    }
  }

  /**
   * Validate Google AI API key
   */
  private async validateGoogle(apiKey: string): Promise<ValidateKeyResult> {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 400 || response.status === 401 || response.status === 403) {
        return { 
          valid: false, 
          error: 'Invalid API key' 
        };
      }

      return { 
        valid: false, 
        error: `API returned status ${response.status}` 
      };
    } catch {
      return { 
        valid: false, 
        error: 'Failed to connect to Google AI' 
      };
    }
  }

  /**
   * Validate Grok API key
   */
  private async validateGrok(apiKey: string): Promise<ValidateKeyResult> {
    try {
      const response = await fetch('https://api.x.ai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 401) {
        return { 
          valid: false, 
          error: 'Invalid API key' 
        };
      }

      return { 
        valid: false, 
        error: `API returned status ${response.status}` 
      };
    } catch {
      return { 
        valid: false, 
        error: 'Failed to connect to Grok' 
      };
    }
  }

  /**
   * Validate custom endpoint API key
   */
  private async validateCustom(
    apiKey: string, 
    customUrl?: string
  ): Promise<ValidateKeyResult> {
    if (!customUrl) {
      return { 
        valid: false, 
        error: 'Custom URL is required' 
      };
    }

    try {
      // Try to call a models endpoint (OpenAI compatible)
      const response = await fetch(`${customUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        return { valid: true };
      }

      if (response.status === 401) {
        return { 
          valid: false, 
          error: 'Invalid API key' 
        };
      }

      // Try without /v1/models suffix
      const baseResponse = await fetch(customUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (baseResponse.ok) {
        return { valid: true };
      }

      return { 
        valid: false, 
        error: 'Failed to validate with custom endpoint' 
      };
    } catch {
      return { 
        valid: false, 
        error: 'Failed to connect to custom endpoint' 
      };
    }
  }

  /**
   * Test if a key is working
   */
  async testKey(
    userId: string,
    provider: string
  ): Promise<ValidateKeyResult> {
    try {
      // Get the key
      const apiKey = await this.getKey(userId, provider);
      if (!apiKey) {
        return { 
          valid: false, 
          error: 'Key not found' 
        };
      }

      // Get custom URL if needed
      let customUrl: string | undefined;
      if (provider === 'custom') {
        const metadata = await this.getUserKeys(userId);
        const keyData = metadata.find(k => k.provider === provider);
        customUrl = keyData?.custom_url || undefined;
      }

      // Validate it
      return await this.validateKey(provider, apiKey, customUrl);
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Test failed' 
      };
    }
  }

  /**
   * Decrypt key hint for display
   */
  async decryptHint(
    userId: string,
    encryptedHint: string
  ): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.rpc('decrypt_key_hint', {
        p_user_id: userId,
        p_encrypted_hint: encryptedHint
      });

      if (error) {
        console.error('Error decrypting hint:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in decryptHint:', error);
      return null;
    }
  }
}