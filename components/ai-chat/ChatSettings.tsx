import { useState, useEffect } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import { X, ChevronDown, Settings, Key, Loader2 } from 'lucide-react';
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
    defaultModels: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo']
  },
  anthropic: {
    name: 'Anthropic',
    defaultModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
  },
  google: {
    name: 'Google',
    defaultModels: ['gemini-pro', 'gemini-pro-vision']
  },
  grok: {
    name: 'Grok',
    defaultModels: ['grok-1']
  },
  custom: {
    name: 'Custom',
    defaultModels: []
  }
};

export default function ChatSettings({ isOpen, onClose, refreshTrigger = 0 }: ChatSettingsProps) {
  const { providerSettings, setProviderSettings } = useAIChatStore();
  const [selectedProvider, setSelectedProvider] = useState<keyof typeof PROVIDER_OPTIONS>('openai');
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [userId, setUserId] = useState<string | null>(null);
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [loadingModels, setLoadingModels] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<Record<string, boolean>>({});
  const [customModel, setCustomModel] = useState('');
  const [keyUpdateCounter, setKeyUpdateCounter] = useState(0);

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

  // Check for API keys and fetch models
  useEffect(() => {
    if (!userId) return;

    const checkApiKeysAndFetchModels = async () => {
      const providers = Object.keys(PROVIDER_OPTIONS) as (keyof typeof PROVIDER_OPTIONS)[];
      
      for (const provider of providers) {
        // Check if user has API key
        const keys = await keyService.getUserKeys(userId);
        const hasKey = keys.some(k => k.provider === provider && k.is_active);
        setHasApiKey(prev => ({ ...prev, [provider]: hasKey }));

        // Fetch models if has key and not custom provider
        if (hasKey && provider !== 'custom') {
          await fetchModelsForProvider(provider);
        }
      }
    };

    checkApiKeysAndFetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshTrigger, keyUpdateCounter]); // Add refreshTrigger and keyUpdateCounter to dependencies

  const fetchModelsForProvider = async (provider: string) => {
    if (!userId) return;
    
    setLoadingModels(provider);
    try {
      const { data, error } = await supabase.functions.invoke('get-models', {
        body: { provider }
      });

      if (!error && data?.models && data.models.length > 0) {
        setModels(prev => ({ ...prev, [provider]: data.models }));
        
        // If current model is empty or not in the list, set first model as default
        const currentModel = providerSettings[provider as keyof typeof PROVIDER_OPTIONS]?.model;
        if (!currentModel || !data.models.includes(currentModel)) {
          handleSettingChange('model', data.models[0]);
        }
      } else {
        // Use default models if fetch fails
        const defaultModels = PROVIDER_OPTIONS[provider as keyof typeof PROVIDER_OPTIONS].defaultModels;
        setModels(prev => ({ 
          ...prev, 
          [provider]: defaultModels 
        }));
        
        // Set first default model if current is empty
        const currentModel = providerSettings[provider as keyof typeof PROVIDER_OPTIONS]?.model;
        if (!currentModel && defaultModels.length > 0) {
          handleSettingChange('model', defaultModels[0]);
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

  const handleSettingChange = (key: string, value: string | number) => {
    setProviderSettings(selectedProvider, {
      ...currentSettings,
      [key]: value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-card rounded-lg shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
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
                <label className="block text-sm font-medium mb-2">AI 프로바이더</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(PROVIDER_OPTIONS).map(([key, provider]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedProvider(key as keyof typeof PROVIDER_OPTIONS)}
                      className={cn(
                        "p-2 rounded-lg border transition-colors",
                        selectedProvider === key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      {provider.name}
                    </button>
                  ))}
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
                      {/* Always show current model even if not in list */}
                      {currentSettings.model && !models[selectedProvider]?.includes(currentSettings.model) && !PROVIDER_OPTIONS[selectedProvider].defaultModels.includes(currentSettings.model) && (
                        <option key={currentSettings.model} value={currentSettings.model}>
                          {currentSettings.model} (current)
                        </option>
                      )}
                      {/* Show fetched models or default models */}
                      {models[selectedProvider]?.length > 0 ? (
                        models[selectedProvider].map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))
                      ) : (
                        PROVIDER_OPTIONS[selectedProvider].defaultModels.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))
                      )}
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