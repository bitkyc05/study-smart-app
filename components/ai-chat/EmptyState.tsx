import { useAIChatStore } from '@/store/useAIChatStore';
import { Bot, Sparkles, Code, BookOpen, Lightbulb } from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: Code,
    title: "코드 리뷰 요청",
    prompt: "이 React 컴포넌트의 성능을 개선할 수 있는 방법을 알려주세요."
  },
  {
    icon: BookOpen,
    title: "개념 설명",
    prompt: "useEffect와 useLayoutEffect의 차이점을 예제와 함께 설명해주세요."
  },
  {
    icon: Lightbulb,
    title: "문제 해결",
    prompt: "CORS 에러가 발생하는데 어떻게 해결할 수 있을까요?"
  },
  {
    icon: Sparkles,
    title: "아이디어 브레인스토밍",
    prompt: "사용자 경험을 개선할 수 있는 AI 기능 아이디어를 제안해주세요."
  }
];

export default function EmptyState() {
  const { addSession, setActiveSession, addMessage } = useAIChatStore();

  const handleSuggestionClick = (prompt: string) => {
    // 새 세션 생성
    const newSession = {
      id: `session-${Date.now()}`,
      userId: 'current-user', // TODO: Get from auth
      title: prompt.substring(0, 50) + '...',
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      isArchived: false
    };
    
    addSession(newSession);
    setActiveSession(newSession.id);
    
    // 메시지 추가
    setTimeout(() => {
      const message = {
        id: `msg-${Date.now()}`,
        role: 'user' as const,
        content: prompt,
        createdAt: new Date()
      };
      addMessage(newSession.id, message);
    }, 100);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        {/* 로고 */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Bot className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* 환영 메시지 */}
        <h2 className="text-2xl font-semibold mb-2">
          AI 학습 도우미와 대화를 시작하세요
        </h2>
        <p className="text-muted-foreground mb-8">
          코드 작성, 디버깅, 학습 등 다양한 도움을 받을 수 있습니다
        </p>

        {/* 제안 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SUGGESTIONS.map((suggestion, index) => {
            const Icon = suggestion.icon;
            
            return (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion.prompt)}
                className="p-4 bg-card border rounded-lg hover:border-primary hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{suggestion.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {suggestion.prompt}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 팁 */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 팁: 파일을 드래그하여 코드나 문서를 공유하고, 
            <kbd className="px-1 py-0.5 mx-1 bg-background rounded text-xs">⌘K</kbd>
            로 빠르게 검색할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}