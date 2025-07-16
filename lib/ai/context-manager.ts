import { createClient } from '@/lib/supabase/client';

export interface FileContext {
  id: string;
  name: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  relevanceScore?: number;
}

export class ContextManager {
  private maxTokens: number;
  private tokenEstimator: (text: string) => number;
  
  constructor(maxTokens = 100000) {
    this.maxTokens = maxTokens;
    this.tokenEstimator = (text: string) => Math.ceil(text.length / 4);
  }

  // 컨텍스트 윈도우에 맞게 파일 내용 최적화
  optimizeContext(
    files: FileContext[],
    currentMessages: { content: string }[],
    reserveTokens = 2000 // 응답용 여유분
  ): FileContext[] {
    // 현재 메시지의 토큰 계산
    const messageTokens = this.estimateMessageTokens(currentMessages);
    const availableTokens = this.maxTokens - messageTokens - reserveTokens;
    
    if (availableTokens <= 0) {
      return []; // 공간 없음
    }

    // 파일 우선순위 정렬
    const prioritizedFiles = this.prioritizeFiles(files);
    
    // 토큰 한도 내에서 파일 선택
    const selectedFiles: FileContext[] = [];
    let usedTokens = 0;
    
    for (const file of prioritizedFiles) {
      const fileTokens = this.tokenEstimator(file.content);
      
      if (usedTokens + fileTokens <= availableTokens) {
        selectedFiles.push(file);
        usedTokens += fileTokens;
      } else {
        // 파일 일부만 포함 가능한 경우
        const remainingTokens = availableTokens - usedTokens;
        if (remainingTokens > 1000) { // 최소 1000 토큰은 있어야 의미 있음
          const truncatedFile = this.truncateFile(file, remainingTokens);
          selectedFiles.push(truncatedFile);
          break;
        }
      }
    }
    
    return selectedFiles;
  }

  // 파일 우선순위 결정
  private prioritizeFiles(files: FileContext[]): FileContext[] {
    return files.sort((a, b) => {
      // 1. 관련성 점수가 있으면 우선
      if (a.relevanceScore && b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      
      // 2. 최신 파일 우선
      const aTime = Number(a.metadata.uploadedAt) || 0;
      const bTime = Number(b.metadata.uploadedAt) || 0;
      return bTime - aTime;
    });
  }

  // 파일 내용 자르기
  private truncateFile(file: FileContext, maxTokens: number): FileContext {
    const maxChars = maxTokens * 4; // 대략적인 변환
    let truncatedContent = file.content;
    
    if (file.content.length > maxChars) {
      // 의미 있는 단위로 자르기
      truncatedContent = this.smartTruncate(file.content, maxChars);
      truncatedContent += '\n\n[... 내용이 잘렸습니다 ...]';
    }
    
    return {
      ...file,
      content: truncatedContent,
      metadata: {
        ...file.metadata,
        truncated: true,
        originalLength: file.content.length
      }
    };
  }

  // 문장/단락 경계에서 자르기
  private smartTruncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    // 마지막 문장 경계 찾기
    let truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    
    const cutPoint = Math.max(lastPeriod, lastNewline);
    if (cutPoint > maxLength * 0.8) { // 80% 이상이면 그 지점에서 자르기
      truncated = text.substring(0, cutPoint + 1);
    }
    
    return truncated;
  }

  // 메시지 토큰 추정
  private estimateMessageTokens(messages: { content: string }[]): number {
    return messages.reduce((total, msg) => {
      return total + this.tokenEstimator(msg.content || '');
    }, 0);
  }

  // 시맨틱 검색을 위한 관련성 계산
  async calculateRelevance(
    query: string,
    files: FileContext[],
    queryEmbedding?: number[]
  ): Promise<FileContext[]> {
    if (!queryEmbedding || files.some(f => !f.embedding)) {
      // 임베딩이 없으면 키워드 기반 매칭
      return this.keywordBasedRelevance(query, files);
    }
    
    // 코사인 유사도 계산
    return files.map(file => ({
      ...file,
      relevanceScore: this.cosineSimilarity(queryEmbedding, file.embedding!)
    })).sort((a, b) => b.relevanceScore! - a.relevanceScore!);
  }

  // 키워드 기반 관련성
  private keywordBasedRelevance(query: string, files: FileContext[]): FileContext[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    
    return files.map(file => {
      const content = file.content.toLowerCase();
      const matchCount = queryWords.filter(word => 
        content.includes(word)
      ).length;
      
      return {
        ...file,
        relevanceScore: matchCount / queryWords.length
      };
    }).sort((a, b) => b.relevanceScore! - a.relevanceScore!);
  }

  // 코사인 유사도
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

// 사용 예시
export async function prepareFileContext(
  userId: string,
  query: string,
  modelConfig: { maxTokens: number }
): Promise<string> {
  const supabase = createClient();
  
  // 사용자의 파일들 조회
  const { data: files } = await supabase
    .from('file_contexts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ready');
  
  if (!files || files.length === 0) return '';
  
  // FileContext 형식으로 변환
  const fileContexts: FileContext[] = files.map(f => ({
    id: f.id,
    name: f.file_name,
    content: f.content_text || '',
    embedding: f.content_embedding ? JSON.parse(f.content_embedding) : undefined,
    metadata: (f.metadata as Record<string, unknown>) || {}
  }));
  
  // 컨텍스트 매니저로 최적화
  const contextManager = new ContextManager(modelConfig.maxTokens);
  
  // 관련성 계산 (쿼리 임베딩이 있다면)
  const relevantFiles = await contextManager.calculateRelevance(
    query, 
    fileContexts
  );
  
  // 토큰 한도에 맞게 선택
  const optimizedFiles = contextManager.optimizeContext(
    relevantFiles,
    [] // 현재 메시지들
  );
  
  // 컨텍스트 문자열 생성
  return optimizedFiles.map(file => 
    `## File: ${file.name}\n\n${file.content}`
  ).join('\n\n---\n\n');
}