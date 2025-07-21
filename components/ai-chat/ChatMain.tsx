import { useAIChatStore } from '@/store/useAIChatStore';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import EmptyState from './EmptyState';
import { Settings, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { APIKeyService } from '@/lib/services/api-key-service';

interface ChatMainProps {
  onSettingsClick: () => void;
  className?: string;
}

export default function ChatMain({ onSettingsClick, className }: ChatMainProps) {
  const { activeSessionId } = useAIChatStore();

  return (
    <div className={cn("flex-1 flex flex-col", className)}>
      {/* 헤더 */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <CurrentSessionInfo />
        </div>
        
        <button
          onClick={onSettingsClick}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* 메시지 영역 */}
      {activeSessionId ? (
        <>
          <ChatMessages className="flex-1" />
          <ChatInput className="flex-none" />
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

// 현재 세션 정보
function CurrentSessionInfo() {
  const { sessions, activeSessionId, providerSettings, updateSession, setProviderSettings } = useAIChatStore();
  const currentSession = sessions.find(s => s.id === activeSessionId);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState<string | null>(null);
  
  const supabase = createClient();
  const keyService = new APIKeyService(supabase);

  const PROVIDER_OPTIONS = {
    openai: { name: 'OpenAI', defaultModels: ['o3-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'] },
    anthropic: { name: 'Anthropic', defaultModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
    google: { name: 'Google', defaultModels: ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-pro', 'gemini-pro-vision'] },
    grok: { name: 'Grok', defaultModels: ['grok-1'] },
    custom: { name: 'Custom', defaultModels: [] }
  };

  // 세션이 없을 때도 기본 프로바이더 설정 표시
  const defaultProvider = availableProviders.length > 0 ? availableProviders[0] : 'openai';
  const currentProvider = currentSession?.provider || defaultProvider;
  const currentProviderSettings = providerSettings[currentProvider];
  const currentModels = models[currentProvider] || PROVIDER_OPTIONS[currentProvider as keyof typeof PROVIDER_OPTIONS]?.defaultModels || [];

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;

    const checkApiKeys = async () => {
      const keys = await keyService.getUserKeys(userId);
      const activeProviders = keys.filter(k => k.is_active).map(k => k.provider);
      setAvailableProviders(activeProviders);

      // 현재 프로바이더의 API 키가 없으면 첫 번째 사용 가능한 프로바이더로 변경
      if (currentSession && !activeProviders.includes(currentSession.provider) && activeProviders.length > 0) {
        updateSession(currentSession.id, { provider: activeProviders[0] });
        // 모델 목록 가져오기
        await fetchModelsForProvider(activeProviders[0]);
      } else if (currentSession && activeProviders.includes(currentSession.provider)) {
        // 현재 프로바이더의 모델 목록 가져오기
        await fetchModelsForProvider(currentSession.provider);
      }
    };

    checkApiKeys();
  }, [userId, currentSession?.id, keyService, updateSession]);

  const fetchModelsForProvider = useCallback(async (provider: string) => {
    if (provider === 'custom') return;
    
    console.log(`[ChatMain] Fetching models for provider: ${provider}`);
    setLoadingModels(provider);
    try {
      const { data, error } = await supabase.functions.invoke('get-models', {
        body: { provider }
      });

      console.log(`[ChatMain] Models response for ${provider}:`, { data, error });

      if (!error && data?.models && data.models.length > 0) {
        setModels(prev => ({ ...prev, [provider]: data.models }));
        console.log(`[ChatMain] Set models for ${provider}:`, data.models);
      } else {
        console.log(`[ChatMain] Using default models for ${provider}`);
        setModels(prev => ({ 
          ...prev, 
          [provider]: PROVIDER_OPTIONS[provider as keyof typeof PROVIDER_OPTIONS].defaultModels 
        }));
      }
    } catch (error) {
      console.error(`[ChatMain] Failed to fetch models for ${provider}:`, error);
      setModels(prev => ({ 
        ...prev, 
        [provider]: PROVIDER_OPTIONS[provider as keyof typeof PROVIDER_OPTIONS].defaultModels 
      }));
    } finally {
      setLoadingModels(null);
    }
  }, [supabase, setModels, setLoadingModels]);

  // Watch for provider changes and fetch models
  useEffect(() => {
    if (currentProvider && availableProviders.includes(currentProvider) && !models[currentProvider]) {
      console.log(`[ChatMain] Provider changed to ${currentProvider}, fetching models...`);
      fetchModelsForProvider(currentProvider);
    }
  }, [currentProvider, availableProviders, models, fetchModelsForProvider]);

  const handleProviderChange = async (newProvider: string) => {
    console.log(`[ChatMain] Provider changed to: ${newProvider}`);
    
    // 세션이 있으면 업데이트
    if (currentSession) {
      updateSession(currentSession.id, { 
        provider: newProvider,
        model: '' // 모델도 초기화
      });
    }
    
    // 해당 프로바이더의 모델 목록 가져오기
    if (!models[newProvider] && newProvider !== 'custom') {
      await fetchModelsForProvider(newProvider);
    }
    
    // 첫 번째 모델을 기본값으로 설정
    const providerModels = models[newProvider] || PROVIDER_OPTIONS[newProvider as keyof typeof PROVIDER_OPTIONS].defaultModels;
    const firstModel = providerModels[0] || '';
    
    console.log(`[ChatMain] Setting default model for ${newProvider}: ${firstModel}`);
    
    // providerSettings 업데이트 (이게 중요!)
    setProviderSettings(newProvider, {
      ...providerSettings[newProvider],
      model: firstModel
    });
    
    // 세션의 모델도 업데이트
    if (currentSession && firstModel) {
      console.log(`[ChatMain] Updating session ${currentSession.id} with provider=${newProvider}, model=${firstModel}`);
      updateSession(currentSession.id, { 
        provider: newProvider,
        model: firstModel
      });
    }
  };

  const handleModelChange = (newModel: string) => {
    const defaultProvider = availableProviders.length > 0 ? availableProviders[0] : 'openai';
    const provider = currentSession?.provider || defaultProvider;
    
    console.log(`[ChatMain] Model changed: provider=${provider}, model=${newModel}`);
    
    // providerSettings 업데이트 - undefined 체크 추가
    const currentSettings = providerSettings[provider] || {};
    setProviderSettings(provider, {
      ...currentSettings,
      model: newModel
    });
    
    // 세션도 업데이트
    if (currentSession) {
      console.log(`[ChatMain] Updating session ${currentSession.id} with model: ${newModel}`);
      updateSession(currentSession.id, { 
        model: newModel 
      });
    }
  };

  return (
    <div className="flex items-center gap-3">
      <h2 className="font-medium">
        {currentSession ? currentSession.title : '새 대화'}
      </h2>
      
      {/* 프로바이더 & 모델 드롭다운 */}
      <div className="relative">
        <button
          onClick={() => {
            setIsDropdownOpen(!isDropdownOpen);
            // Fetch models when opening dropdown if not already loaded
            if (!isDropdownOpen && currentProvider && !models[currentProvider] && availableProviders.includes(currentProvider)) {
              fetchModelsForProvider(currentProvider);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border border-primary/20 rounded-lg transition-all shadow-sm hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-foreground">
              {PROVIDER_OPTIONS[currentProvider as keyof typeof PROVIDER_OPTIONS]?.name || currentProvider}
            </span>
          </div>
          <span className="text-muted-foreground">·</span>
          <span className="text-primary font-semibold">{currentProviderSettings?.model || currentModels[0] || 'Select model'}</span>
          <ChevronDown className={cn(
            "w-4 h-4 ml-1 transition-transform",
            isDropdownOpen && "rotate-180"
          )} />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-[480px] bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 flex h-[320px]">
            {/* 프로바이더 선택 - 왼쪽 */}
            <div className="w-[180px] border-r border-gray-200 dark:border-gray-700 p-3">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">프로바이더</p>
              <div className="space-y-1">
                {Object.entries(PROVIDER_OPTIONS).map(([key, provider]) => {
                  const isAvailable = availableProviders.includes(key);
                  const isSelected = currentProvider === key;
                  return (
                    <button
                      key={key}
                      onClick={() => isAvailable && handleProviderChange(key)}
                      disabled={!isAvailable}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-all",
                        isSelected
                          ? "bg-blue-500 text-white shadow-sm"
                          : isAvailable
                          ? "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                          : "opacity-40 cursor-not-allowed text-gray-500"
                      )}
                    >
                      <span className="font-medium">{provider.name}</span>
                      {!isAvailable && (
                        <span className="text-xs opacity-70">No key</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 모델 선택 - 오른쪽 */}
            <div className="flex-1 p-3">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">모델</p>
              <div className="space-y-1 h-[260px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {loadingModels === currentProvider ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      모델 목록 불러오는 중...
                    </div>
                  </div>
                ) : currentModels.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      사용 가능한 모델이 없습니다
                    </div>
                  </div>
                ) : (
                  currentModels.map(model => {
                    const isSelected = currentProviderSettings?.model === model;
                    return (
                      <button
                        key={model}
                        onClick={() => {
                          handleModelChange(model);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2.5 rounded-md text-sm text-left transition-all",
                          isSelected
                            ? "bg-blue-500 text-white shadow-sm"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        <div className="font-medium">{model}</div>
                        {model.includes('o3') && (
                          <div className="text-xs opacity-70 mt-0.5">최신 모델</div>
                        )}
                        {model.includes('gemini-2.5') && (
                          <div className="text-xs opacity-70 mt-0.5">최신 모델</div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}