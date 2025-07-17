import { useState, useEffect } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import { X, ChevronDown, Settings, Key, Loader2, Bot, Brain, Sparkles, Code2, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import APIKeyManager from './APIKeyManager';
import { APIKeyService } from '@/lib/services/api-key-service';

interface ChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  refreshTrigger?: number; // Add trigger for refreshing models
}

type TabType = 'settings' | 'api-keys';

const PROVIDER_OPTIONS = {
  openai: {
    name: 'OpenAI',
    icon: Bot,
    description: 'o3, GPT-4o, GPT-4 등',
    defaultModels: ['o3-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
  },
  anthropic: {
    name: 'Anthropic',
    icon: Brain,
    description: 'Claude 3 시리즈',
    defaultModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
  },
  google: {
    name: 'Google',
    icon: Sparkles,
    description: 'Gemini 2.5, 2.0, Pro 시리즈',
    defaultModels: ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-pro', 'gemini-pro-vision']
  },
  grok: {
    name: 'Grok',
    icon: Code2,
    description: 'X.AI의 Grok 모델',
    defaultModels: ['grok-1']
  },
  custom: {
    name: 'Custom',
    icon: Cog,
    description: '사용자 정의 모델',
    defaultModels: []
  }
};

export default function ChatSettings({ isOpen, onClose, refreshTrigger = 0 }: ChatSettingsProps) {
  const { providerSettings, setProviderSettings, activeSessionId, sessions, updateSession } = useAIChatStore();
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const [selectedProvider, setSelectedProvider] = useState<keyof typeof PROVIDER_OPTIONS>(
    (activeSession?.provider as keyof typeof PROVIDER_OPTIONS) || 'openai'
  );
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [userId, setUserId] = useState<string | null>(null);
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [loadingModels, setLoadingModels] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<Record<string, boolean>>({});
  const [customModel, setCustomModel] = useState('');
  const [keyUpdateCounter, setKeyUpdateCounter] = useState(0);
  const [modelsFetchedAt, setModelsFetchedAt] = useState<Record<string, number>>({});

  const currentSettings = providerSettings[selectedProvider] || {
    model: '',
    temperature: 0.7,
    maxTokens: 4096,
    customUrl: ''
  };
  const supabase = createClient();
  const keyService = new APIKeyService(supabase);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load cached models from localStorage on mount
  useEffect(() => {
    const cachedModels = localStorage.getItem('ai-chat-models');
    if (cachedModels) {
      try {
        const parsed = JSON.parse(cachedModels);
        setModels(parsed.models || {});
        setModelsFetchedAt(parsed.fetchedAt || {});
      } catch (e) {
        console.error('Failed to parse cached models:', e);
      }
    }
  }, []);

  // Save models to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(models).length > 0) {
      localStorage.setItem('ai-chat-models', JSON.stringify({
        models,
        fetchedAt: modelsFetchedAt
      }));
    }
  }, [models, modelsFetchedAt]);

  // Check for API keys only (no automatic model fetching)
  useEffect(() => {
    if (!userId) return;

    const checkApiKeys = async () => {
      const keys = await keyService.getUserKeys(userId);
      const keyMap: Record<string, boolean> = {};
      
      for (const provider of Object.keys(PROVIDER_OPTIONS)) {
        const hasKey = keys.some(k => k.provider === provider && k.is_active);
        keyMap[provider] = hasKey;
      }
      
      setHasApiKey(keyMap);
    };

    checkApiKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, keyUpdateCounter]); // Removed refreshTrigger

  const fetchModelsForProvider = async (provider: string, forceRefresh = false) => {
    if (!userId) return;
    
    // Check if we have cached models and they're fresh (less than 1 hour old)
    const cachedTime = modelsFetchedAt[provider];
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    if (!forceRefresh && cachedTime && cachedTime > oneHourAgo && models[provider]?.length > 0) {
      console.log(`Using cached models for ${provider}`);
      return;
    }
    
    console.log(`Fetching models for provider: ${provider}`);
    setLoadingModels(provider);
    try {
      const { data, error } = await supabase.functions.invoke('get-models', {
        body: { provider }
      });

      console.log(`Models response for ${provider}:`, { data, error });

      if (!error && data?.models && data.models.length > 0) {
        setModels(prev => ({ ...prev, [provider]: data.models }));
        setModelsFetchedAt(prev => ({ ...prev, [provider]: Date.now() }));
        console.log(`Set models for ${provider}:`, data.models);
        
        // If current model is empty or not in the list, set first model as default
        const currentModel = providerSettings[provider as keyof typeof PROVIDER_OPTIONS]?.model;
        if (!currentModel || !data.models.includes(currentModel)) {
          handleSettingChange('model', data.models[0]);
          // Also update the active session if it's using this provider
          if (activeSessionId && activeSession?.provider === provider) {
            updateSession(activeSessionId, { 
              provider: provider,
              model: data.models[0]
            });
          }
        }
      } else {
        // Use default models if fetch fails
        const defaultModels = PROVIDER_OPTIONS[provider as keyof typeof PROVIDER_OPTIONS].defaultModels;
        console.log(`Using default models for ${provider}:`, defaultModels);
        setModels(prev => ({ 
          ...prev, 
          [provider]: defaultModels 
        }));
        
        // Set first default model if current is empty
        const currentModel = providerSettings[provider as keyof typeof PROVIDER_OPTIONS]?.model;
        if (!currentModel && defaultModels.length > 0) {
          handleSettingChange('model', defaultModels[0]);
          // Also update the active session if it's using this provider
          if (activeSessionId && activeSession?.provider === provider) {
            updateSession(activeSessionId, { 
              provider: provider,
              model: defaultModels[0]
            });
          }
        }
      }
    } catch (error) {
      console.error(`Failed to fetch models for ${provider}:`, error);
      // Use default models on error
      const defaultModels = PROVIDER_OPTIONS[provider as keyof typeof PROVIDER_OPTIONS].defaultModels;
      setModels(prev => ({ 
        ...prev, 
        [provider]: defaultModels 
      }));
      
      // Set first default model if current is empty
      const currentModel = providerSettings[provider as keyof typeof PROVIDER_OPTIONS]?.model;
      if (!currentModel && defaultModels.length > 0) {
        handleSettingChange('model', defaultModels[0]);
        // Also update the active session if it's using this provider
        if (activeSessionId && activeSession?.provider === provider) {
          updateSession(activeSessionId, { 
            provider: provider,
            model: defaultModels[0]
          });
        }
      }
    } finally {
      setLoadingModels(null);
    }
  };

  // Update custom model when provider changes
  useEffect(() => {
    if (selectedProvider === 'custom' && currentSettings.model) {
      setCustomModel(currentSettings.model);
    }
  }, [selectedProvider, currentSettings.model]);

  // When provider changes, fetch models only if not cached
  useEffect(() => {
    if (selectedProvider && hasApiKey[selectedProvider] && selectedProvider !== 'custom') {
      // Only fetch if we don't have cached models
      if (!models[selectedProvider] || models[selectedProvider].length === 0) {
        fetchModelsForProvider(selectedProvider);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider]);

  const handleSettingChange = (key: string, value: string | number) => {
    setProviderSettings(selectedProvider, {
      ...currentSettings,
      [key]: value
    });
    
    // 현재 활성 세션도 업데이트
    if (activeSessionId) {
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession) {
        if (key === 'model') {
          updateSession(activeSessionId, { 
            provider: selectedProvider,
            model: value as string 
          });
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-3xl bg-background rounded-lg shadow-xl border border-border max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">AI 설정</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
              activeTab === 'settings' 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="w-4 h-4" />
            모델 설정
            {activeTab === 'settings' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('api-keys')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
              activeTab === 'api-keys' 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Key className="w-4 h-4" />
            API 키 관리
            {activeTab === 'api-keys' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'settings' ? (
            <>
              {/* 프로바이더 선택 */}
              <div className="p-4 border-b">
                <label className="block text-sm font-medium mb-3">AI 프로바이더</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(PROVIDER_OPTIONS).map(([key, provider]) => {
                    const Icon = provider.icon;
                    const isSelected = selectedProvider === key;
                    const hasKey = hasApiKey[key as keyof typeof PROVIDER_OPTIONS];
                    
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          const newProvider = key as keyof typeof PROVIDER_OPTIONS;
                          setSelectedProvider(newProvider);
                          
                          // 현재 세션의 프로바이더도 업데이트
                          if (activeSessionId) {
                            const providerModels = models[newProvider] || PROVIDER_OPTIONS[newProvider].defaultModels;
                            const firstModel = providerModels[0] || providerSettings[newProvider]?.model || '';
                            
                            updateSession(activeSessionId, { 
                              provider: newProvider,
                              model: firstModel
                            });
                            
                            // providerSettings도 업데이트
                            if (firstModel && !providerSettings[newProvider]?.model) {
                              setProviderSettings(newProvider, {
                                ...providerSettings[newProvider],
                                model: firstModel
                              });
                            }
                          }
                        }}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all text-left group",
                          "hover:shadow-md hover:border-primary/50",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isSelected ? "bg-primary/20" : "bg-muted"
                          )}>
                            <Icon className={cn(
                              "w-5 h-5",
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className={cn(
                                "font-medium",
                                isSelected && "text-primary"
                              )}>
                                {provider.name}
                              </h3>
                              {hasKey && (
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  ✓ API Key
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {provider.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 설정 내용 */}
              <div className="p-4 space-y-4">
          {/* 모델 선택 */}
          <div>
            <label className="block text-sm font-medium mb-2">모델</label>
            {selectedProvider === 'custom' ? (
              <input
                type="text"
                value={customModel}
                onChange={(e) => {
                  setCustomModel(e.target.value);
                  handleSettingChange('model', e.target.value);
                }}
                placeholder="모델명을 입력하세요 (예: llama-2-70b)"
                className="w-full px-3 py-2 bg-muted rounded-lg outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <div className="relative">
                <select
                  value={currentSettings.model}
                  onChange={(e) => handleSettingChange('model', e.target.value)}
                  disabled={!hasApiKey[selectedProvider] || loadingModels === selectedProvider}
                  className="w-full px-3 py-2 pr-8 bg-muted rounded-lg appearance-none outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!hasApiKey[selectedProvider] ? (
                    <option value="">API key unavailable</option>
                  ) : loadingModels === selectedProvider ? (
                    <option value="">모델 목록 불러오는 중...</option>
                  ) : (
                    <>
                      {!currentSettings.model && (
                        <option value="">모델을 선택하세요</option>
                      )}
                      {/* Always show current model even if not in list */}
                      {currentSettings.model && !models[selectedProvider]?.includes(currentSettings.model) && !PROVIDER_OPTIONS[selectedProvider].defaultModels.includes(currentSettings.model) && (
                        <option key={currentSettings.model} value={currentSettings.model}>
                          {currentSettings.model} (current)
                        </option>
                      )}
                      {/* Show fetched models if available */}
                      {models[selectedProvider]?.length > 0 && 
                        models[selectedProvider].map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))
                      }
                    </>
                  )}
                </select>
                {loadingModels === selectedProvider ? (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
                )}
              </div>
            )}
          </div>

          {/* 온도 설정 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              창의성 (Temperature): {currentSettings.temperature || 0.7}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={currentSettings.temperature || 0.7}
              onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>정확함</span>
              <span>창의적</span>
            </div>
          </div>

          {/* 최대 토큰 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              최대 응답 길이: {currentSettings.maxTokens || 4096} 토큰
            </label>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={currentSettings.maxTokens || 4096}
              onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 시스템 프롬프트 */}
          <div>
            <label className="block text-sm font-medium mb-2">시스템 프롬프트 (선택사항)</label>
            <textarea
              value={currentSettings.systemPrompt || ''}
              onChange={(e) => handleSettingChange('systemPrompt', e.target.value)}
              placeholder="AI의 기본 행동이나 역할을 정의하세요..."
              className="w-full px-3 py-2 bg-muted rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>

                {/* 커스텀 URL (custom provider용) */}
                {selectedProvider === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">API 엔드포인트 URL</label>
                    <input
                      type="url"
                      value={currentSettings.customUrl || ''}
                      onChange={(e) => handleSettingChange('customUrl', e.target.value)}
                      placeholder="https://api.example.com/v1/chat"
                      className="w-full px-3 py-2 bg-muted rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* API 키 관리 탭 */
            <div className="p-4">
              {userId ? (
                <APIKeyManager 
                  userId={userId} 
                  onKeyUpdate={() => setKeyUpdateCounter(prev => prev + 1)}
                  onModelRefresh={(provider) => fetchModelsForProvider(provider, true)}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  로그인이 필요합니다
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}