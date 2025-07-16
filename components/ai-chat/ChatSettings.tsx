import { useState } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_OPTIONS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo']
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
  },
  google: {
    name: 'Google',
    models: ['gemini-pro', 'gemini-pro-vision']
  },
  grok: {
    name: 'Grok',
    models: ['grok-1']
  },
  custom: {
    name: 'Custom',
    models: ['custom-model']
  }
};

export default function ChatSettings({ isOpen, onClose }: ChatSettingsProps) {
  const { providerSettings, setProviderSettings } = useAIChatStore();
  const [selectedProvider, setSelectedProvider] = useState<keyof typeof PROVIDER_OPTIONS>('openai');

  const currentSettings = providerSettings[selectedProvider];

  const handleSettingChange = (key: string, value: string | number) => {
    setProviderSettings(selectedProvider, {
      ...currentSettings,
      [key]: value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card rounded-lg shadow-lg">
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
            <div className="relative">
              <select
                value={currentSettings.model}
                onChange={(e) => handleSettingChange('model', e.target.value)}
                className="w-full px-3 py-2 pr-8 bg-muted rounded-lg appearance-none outline-none focus:ring-2 focus:ring-primary"
              >
                {PROVIDER_OPTIONS[selectedProvider].models.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>
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