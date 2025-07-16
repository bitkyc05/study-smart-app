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
          {activeSessionId ? (
            <CurrentSessionInfo />
          ) : (
            <span className="text-muted-foreground">대화를 선택하거나 새로 시작하세요</span>
          )}
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
    openai: { name: 'OpenAI', defaultModels: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'] },
    anthropic: { name: 'Anthropic', defaultModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
    google: { name: 'Google', defaultModels: ['gemini-pro', 'gemini-pro-vision'] },
    grok: { name: 'Grok', defaultModels: ['grok-1'] },
    custom: { name: 'Custom', defaultModels: [] }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

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
  }, [userId, currentSession?.id]);

  const fetchModelsForProvider = async (provider: string) => {
    if (provider === 'custom') return;
    
    setLoadingModels(provider);
    try {
      const { data, error } = await supabase.functions.invoke('get-models', {
        body: { provider }
      });

      if (!error && data?.models && data.models.length > 0) {
        setModels(prev => ({ ...prev, [provider]: data.models }));
      } else {
        setModels(prev => ({ 
          ...prev, 
          [provider]: PROVIDER_OPTIONS[provider as keyof typeof PROVIDER_OPTIONS].defaultModels 
        }));
      }
    } catch (error) {
      console.error(`Failed to fetch models for ${provider}:`, error);
      setModels(prev => ({ 
        ...prev, 
        [provider]: PROVIDER_OPTIONS[provider as keyof typeof PROVIDER_OPTIONS].defaultModels 
      }));
    } finally {
      setLoadingModels(null);
    }
  };

  const handleProviderChange = async (newProvider: string) => {
    if (!currentSession) return;
    
    updateSession(currentSession.id, { provider: newProvider });
    
    // 해당 프로바이더의 모델 목록 가져오기
    if (!models[newProvider] && newProvider !== 'custom') {
      await fetchModelsForProvider(newProvider);
    }
    
    // 첫 번째 모델을 기본값으로 설정
    const providerModels = models[newProvider] || PROVIDER_OPTIONS[newProvider as keyof typeof PROVIDER_OPTIONS].defaultModels;
    if (providerModels.length > 0) {
      setProviderSettings(newProvider, {
        ...providerSettings[newProvider],
        model: providerModels[0]
      });
    }
  };

  const handleModelChange = (newModel: string) => {
    if (!currentSession) return;
    
    setProviderSettings(currentSession.provider, {
      ...providerSettings[currentSession.provider],
      model: newModel
    });
  };

  if (!currentSession) return null;

  const currentProviderSettings = providerSettings[currentSession.provider];
  const currentModels = models[currentSession.provider] || PROVIDER_OPTIONS[currentSession.provider as keyof typeof PROVIDER_OPTIONS]?.defaultModels || [];

  return (
    <div className="flex items-center gap-3">
      <h2 className="font-medium">{currentSession.title}</h2>
      
      {/* 프로바이더 & 모델 드롭다운 */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
        >
          <span className="text-muted-foreground">
            {PROVIDER_OPTIONS[currentSession.provider as keyof typeof PROVIDER_OPTIONS]?.name || currentSession.provider}
          </span>
          <span className="text-muted-foreground">·</span>
          <span>{currentProviderSettings?.model || currentSession.model}</span>
          <ChevronDown className="w-4 h-4 ml-1" />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-card border rounded-lg shadow-lg z-50">
            {/* 프로바이더 선택 */}
            <div className="p-2 border-b">
              <p className="text-xs font-medium text-muted-foreground mb-1">프로바이더</p>
              <div className="space-y-1">
                {Object.entries(PROVIDER_OPTIONS).map(([key, provider]) => {
                  const isAvailable = availableProviders.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => isAvailable && handleProviderChange(key)}
                      disabled={!isAvailable}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors",
                        currentSession.provider === key
                          ? "bg-primary text-primary-foreground"
                          : isAvailable
                          ? "hover:bg-muted"
                          : "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span>{provider.name}</span>
                      {!isAvailable && <span className="text-xs">No API key</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 모델 선택 */}
            <div className="p-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">모델</p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {loadingModels === currentSession.provider ? (
                  <div className="text-sm text-muted-foreground py-2 text-center">
                    모델 목록 불러오는 중...
                  </div>
                ) : (
                  currentModels.map(model => (
                    <button
                      key={model}
                      onClick={() => {
                        handleModelChange(model);
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full px-2 py-1.5 rounded text-sm text-left transition-colors",
                        currentProviderSettings?.model === model
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      {model}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}