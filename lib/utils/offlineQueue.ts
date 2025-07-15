interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount: number;
  type: 'session' | 'settings' | 'other';
}

class OfflineQueue {
  private static instance: OfflineQueue;
  private readonly STORAGE_KEY = 'offline_queue';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1초부터 시작
  private isProcessing = false;

  private constructor() {
    // 네트워크 상태 변경 감지
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Network is back online, processing queue...');
        this.processQueue();
      });
    }
  }

  static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue();
    }
    return OfflineQueue.instance;
  }

  // 큐에 요청 추가
  async addToQueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0
    };

    const queue = this.getQueue();
    queue.push(queuedRequest);
    this.saveQueue(queue);

    // 온라인 상태라면 즉시 처리 시도
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  // 큐 처리
  async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return;

    this.isProcessing = true;
    const queue = this.getQueue();

    for (let i = 0; i < queue.length; i++) {
      const request = queue[i];
      
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body
        });

        if (response.ok) {
          // 성공하면 큐에서 제거
          queue.splice(i, 1);
          i--; // 인덱스 조정
          this.saveQueue(queue);
        } else if (response.status >= 400 && response.status < 500) {
          // 4xx 오류는 재시도해도 의미없으므로 제거
          console.error(`Request failed with ${response.status}, removing from queue`);
          queue.splice(i, 1);
          i--;
          this.saveQueue(queue);
        } else {
          // 5xx 오류는 재시도
          this.handleRetry(request, queue, i);
        }
      } catch (error) {
        // 네트워크 오류 등은 재시도
        console.error('Queue processing error:', error);
        this.handleRetry(request, queue, i);
      }
    }

    this.isProcessing = false;
  }

  private handleRetry(request: QueuedRequest, queue: QueuedRequest[], index: number): void {
    request.retryCount++;
    
    if (request.retryCount >= this.MAX_RETRIES) {
      // 최대 재시도 횟수 초과시 제거
      console.error(`Max retries exceeded for request ${request.id}`);
      queue.splice(index, 1);
      this.saveQueue(queue);
    } else {
      // 재시도 대기
      setTimeout(() => {
        this.processQueue();
      }, this.RETRY_DELAY * Math.pow(2, request.retryCount)); // 지수 백오프
    }
  }

  // localStorage에서 큐 가져오기
  private getQueue(): QueuedRequest[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  // localStorage에 큐 저장
  private saveQueue(queue: QueuedRequest[]): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
  }

  // 큐 상태 확인
  getQueueStatus(): { pending: number; items: QueuedRequest[] } {
    const queue = this.getQueue();
    return {
      pending: queue.length,
      items: queue
    };
  }

  // 특정 타입의 요청만 재시도
  async retryByType(type: QueuedRequest['type']): Promise<void> {
    const queue = this.getQueue();
    const filtered = queue.filter(item => item.type === type);
    
    for (const request of filtered) {
      request.retryCount = 0; // 재시도 카운트 리셋
    }
    
    this.saveQueue(queue);
    await this.processQueue();
  }

  // 큐 비우기
  clearQueue(): void {
    this.saveQueue([]);
  }
}

export const offlineQueue = OfflineQueue.getInstance();

// API 래퍼 함수 - 자동으로 오프라인 큐 처리
export async function fetchWithOfflineSupport(
  url: string,
  options: RequestInit & { offlineQueueType?: QueuedRequest['type'] } = {}
): Promise<Response | null> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok && !navigator.onLine && options.offlineQueueType) {
      // 오프라인이고 요청이 실패하면 큐에 추가
      await offlineQueue.addToQueue({
        url,
        method: options.method || 'GET',
        headers: options.headers as Record<string, string>,
        body: options.body as string,
        type: options.offlineQueueType
      });
      
      return null; // 오프라인 큐에 추가됨을 나타냄
    }
    
    return response;
  } catch (error) {
    // 네트워크 오류시 큐에 추가
    if (!navigator.onLine && options.offlineQueueType) {
      await offlineQueue.addToQueue({
        url,
        method: options.method || 'GET',
        headers: options.headers as Record<string, string>,
        body: options.body as string,
        type: options.offlineQueueType
      });
      
      return null;
    }
    
    throw error;
  }
}