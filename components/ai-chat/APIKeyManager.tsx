"use client";

import { useState, useEffect } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import { APIKeyService, APIKeyMetadata } from '@/lib/services/api-key-service';
import { createClient } from '@/lib/supabase/client';
import { 
  Shield, 
  Check, 
  X, 
  Eye, 
  EyeOff,
  RefreshCw,
  Trash2,
  Clock,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface APIKeyManagerProps {
  userId: string;
}

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    keyFormat: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    models: ['claude-3-opus', 'claude-3-5-sonnet', 'claude-3-haiku'],
    keyFormat: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/account/keys'
  },
  {
    id: 'google',
    name: 'Google AI',
    icon: '🔷',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    keyFormat: 'AIza...',
    docsUrl: 'https://makersuite.google.com/app/apikey'
  },
  {
    id: 'grok',
    name: 'Grok',
    icon: '🚀',
    models: ['grok-2', 'grok-1'],
    keyFormat: 'xai-...',
    docsUrl: 'https://console.x.ai/api-keys'
  },
  {
    id: 'custom',
    name: 'Custom API',
    icon: '⚙️',
    models: [],
    keyFormat: 'Any format',
    requiresUrl: true,
    docsUrl: ''
  }
];

export default function APIKeyManager({ userId }: APIKeyManagerProps) {
  const [keys, setKeys] = useState<Record<string, APIKeyMetadata>>({});
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [decryptedHints, setDecryptedHints] = useState<Record<string, string>>({});
  
  const supabase = createClient();
  const keyService = new APIKeyService(supabase);

  useEffect(() => {
    const loadKeys = async () => {
    setLoading(true);
    try {
      const userKeys = await keyService.getUserKeys(userId);
      
      const keyMap: Record<string, APIKeyMetadata> = {};
      for (const key of userKeys) {
        keyMap[key.provider] = key;
        
        // Decrypt hint
        if (key.encrypted_hint) {
          const hint = await keyService.decryptHint(userId, key.encrypted_hint);
          if (hint) {
            setDecryptedHints(prev => ({
              ...prev,
              [key.provider]: hint
            }));
          }
        }
      }
      setKeys(keyMap);
    } catch (error) {
      console.error('Error loading keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };
  
    loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSaveKey = async (provider: string) => {
    if (!newKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setValidating(provider);
    try {
      const result = await keyService.storeKey(
        userId,
        provider,
        newKey,
        provider === 'custom' ? customUrl : undefined
      );

      if (result.success) {
        toast.success('API key saved successfully');
        setEditingProvider(null);
        setNewKey('');
        setCustomUrl('');
        await loadKeys();
      } else {
        toast.error(result.error || 'Failed to save API key');
      }
    } catch (error) {
      console.error('Error saving key:', error);
      toast.error('An error occurred while saving the key');
    } finally {
      setValidating(null);
    }
  };

  const handleDeleteKey = async (provider: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const success = await keyService.deleteKey(userId, provider);
      if (success) {
        toast.success('API key deleted successfully');
        await loadKeys();
      } else {
        toast.error('Failed to delete API key');
      }
    } catch (error) {
      console.error('Error deleting key:', error);
      toast.error('An error occurred while deleting the key');
    }
  };

  const handleTestKey = async (provider: string) => {
    setValidating(provider);
    try {
      const result = await keyService.testKey(userId, provider);

      if (result.valid) {
        toast.success('API key is working correctly');
      } else {
        toast.error(result.error || 'API key validation failed');
      }
    } catch (error) {
      console.error('Error testing key:', error);
      toast.error('An error occurred while testing the key');
    } finally {
      setValidating(null);
    }
  };

  const renderProviderCard = (provider: typeof PROVIDERS[0]) => {
    const keyData = keys[provider.id];
    const isActive = keyData?.is_active;
    const hasKey = !!keyData;
    const isEditing = editingProvider === provider.id;
    const isValidatingThis = validating === provider.id;
    const hint = decryptedHints[provider.id];

    return (
      <div
        key={provider.id}
        className={`p-4 border rounded-lg transition-all border-border ${hasKey && isActive ? 'bg-card' : 'bg-muted/20'}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{provider.icon}</span>
            <div>
              <h3 className="font-medium text-lg">{provider.name}</h3>
              <p className="text-sm text-muted-foreground">
                {provider.keyFormat}
              </p>
            </div>
          </div>
          
          {hasKey && (
            <div className="flex items-center gap-2">
              {isActive ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                  <X className="w-4 h-4" />
                  Inactive
                </span>
              )}
            </div>
          )}
        </div>

        {hasKey && !isEditing ? (
          <>
            {/* Key info display */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">API Key</span>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded font-mono text-xs">
                    {showKey[provider.id] && hint ? 
                      `${'•'.repeat(20)}${hint}` : 
                      `••••••••${hint || '****'}`
                    }
                  </code>
                  <button
                    onClick={() => setShowKey(prev => ({
                      ...prev,
                      [provider.id]: !prev[provider.id]
                    }))}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    {showKey[provider.id] ? 
                      <EyeOff className="w-4 h-4" /> : 
                      <Eye className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
              
              {keyData.last_used_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last used</span>
                  <span className="flex items-center gap-1 text-xs">
                    <Clock className="w-3 h-3" />
                    {new Date(keyData.last_used_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {keyData.expires_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    {new Date(keyData.expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {provider.id === 'custom' && keyData.custom_url && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">API URL</span>
                  <code className="px-2 py-1 bg-muted rounded text-xs max-w-[200px] truncate">
                    {keyData.custom_url}
                  </code>
                </div>
              )}

              {keyData.usage_count > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total requests</span>
                  <span className="text-xs">{keyData.usage_count.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleTestKey(provider.id)}
                disabled={isValidatingThis}
                className="flex-1 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isValidatingThis ? (
                  <RefreshCw className="w-4 h-4 mx-auto animate-spin" />
                ) : (
                  'Test'
                )}
              </button>
              <button
                onClick={() => {
                  setEditingProvider(provider.id);
                  setNewKey('');
                  if (provider.id === 'custom' && keyData.custom_url) {
                    setCustomUrl(keyData.custom_url);
                  }
                }}
                className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-md transition-colors text-sm font-medium"
              >
                Replace
              </button>
              <button
                onClick={() => handleDeleteKey(provider.id)}
                className="px-3 py-2 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Key input form */}
            <div className="space-y-3">
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder={`Enter ${provider.name} API key`}
                className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                autoFocus
              />
              
              {provider.requiresUrl && (
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="API endpoint URL (e.g., https://api.example.com)"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveKey(provider.id)}
                  disabled={isValidatingThis || !newKey.trim() || (provider.requiresUrl && !customUrl.trim())}
                  className="flex-1 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {isValidatingThis ? (
                    <RefreshCw className="w-4 h-4 mx-auto animate-spin" />
                  ) : (
                    'Save'
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditingProvider(null);
                    setNewKey('');
                    setCustomUrl('');
                  }}
                  className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-md transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
              
              {provider.docsUrl && (
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  How to get API key
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security notice */}
      <div className="p-4 bg-muted/50 rounded-lg flex items-start gap-3">
        <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium mb-1">Enterprise-grade Security</h4>
          <p className="text-sm text-muted-foreground">
            All API keys are encrypted with AES-256 encryption and stored securely. 
            Even our servers cannot access your decrypted keys directly.
          </p>
        </div>
      </div>

      {/* Provider list */}
      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map(renderProviderCard)}
      </div>

      {/* Usage statistics */}
      <div className="mt-6 p-4 bg-card border rounded-lg">
        <h4 className="font-medium mb-3">API Key Statistics</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Active Keys</p>
            <p className="text-2xl font-semibold">
              {Object.values(keys).filter(k => k.is_active).length}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-semibold">
              {Object.values(keys).reduce((sum, k) => sum + (k.usage_count || 0), 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Expiring Soon</p>
            <p className="text-2xl font-semibold">
              {Object.values(keys).filter(k => k.expires_at).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}