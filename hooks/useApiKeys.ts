import { useEffect } from 'react';
import { useAIChatStore } from '@/store/useAIChatStore';
import { APIKeyService } from '@/lib/services/api-key-service';
import { createClient } from '@/lib/supabase/client';

export function useApiKeys(userId: string | null) {
  const { 
    apiKeys, 
    apiKeysLoading, 
    apiKeysLastFetch,
    setApiKeys, 
    setApiKeysLoading, 
    setApiKeysLastFetch 
  } = useAIChatStore();

  const supabase = createClient();
  const keyService = new APIKeyService(supabase);

  useEffect(() => {
    if (!userId) return;

    // Prevent multiple simultaneous loads
    if (apiKeysLoading) return;

    // Check if we've fetched recently (within 5 seconds)
    const now = Date.now();
    if (apiKeysLastFetch && now - apiKeysLastFetch < 5000) {
      return;
    }

    const loadKeys = async () => {
      setApiKeysLoading(true);
      try {
        const keys = await keyService.getUserKeys(userId);
        setApiKeys(keys);
        setApiKeysLastFetch(Date.now());
      } catch (error) {
        console.error('Error loading API keys:', error);
      } finally {
        setApiKeysLoading(false);
      }
    };

    loadKeys();
  }, [userId, keyService, apiKeysLoading, apiKeysLastFetch, setApiKeys, setApiKeysLoading, setApiKeysLastFetch]);

  const refreshKeys = async () => {
    if (!userId || apiKeysLoading) return;
    
    setApiKeysLoading(true);
    try {
      const keys = await keyService.getUserKeys(userId);
      setApiKeys(keys);
      setApiKeysLastFetch(Date.now());
    } catch (error) {
      console.error('Error refreshing API keys:', error);
    } finally {
      setApiKeysLoading(false);
    }
  };

  return {
    apiKeys,
    loading: apiKeysLoading,
    refreshKeys
  };
}