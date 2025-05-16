import { useCallback, useEffect, useState, useRef } from 'react';

interface CMCData {
  symbol: string;
  name: string;
  price: number;
  updated?: string;
}

export function useCMCData() {
  const [data, setData] = useState<CMCData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Use refs for tracking request state without re-renders
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Function to clear any pending timeouts
  const clearTimeouts = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const fetchCMCData = useCallback(async (isRetry = false) => {
    // Use function form of setState to avoid dependency on state values
    setLoading(true);
    
    // Cancel any existing request or retry timeout
    clearTimeouts();
    
    if (isRetry) {
      setRetryCount(prev => prev + 1);
    } else {
      setRetryCount(0);
    }
    
    try {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // Set timeout for the request
      fetchTimeoutRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 5000);
      
      const response = await fetch('/api/cmc', {
        signal: abortControllerRef.current.signal,
        headers: isRetry ? {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        } : {}
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          let retryDelay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;
          throw new Error(`Rate limit exceeded. Retry in ${Math.ceil(retryDelay / 1000)}s.`);
        }
        throw new Error(`CMC API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.price && result.price !== 0) {
        throw new Error('Invalid price data received');
      }
      
      if (isMountedRef.current) {
        setData(result);
        setLastUpdated(new Date());
        setError(null);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const errMessage = err instanceof Error ? err.message : String(err);
      
      if (errMessage.includes('abort') || errMessage.includes('aborted')) {
        console.debug('CMC data request was aborted');
        return;
      }
      
      const isRateLimit = errMessage.includes('Rate limit');
      const isTimeout = errMessage.includes('timeout');
      
      console.error('Error fetching CMC data:', errMessage);
      
      // Get current retry count to make decisions
      let currentRetryCount = 0;
      setRetryCount(prev => {
        currentRetryCount = prev;
        return prev;
      });
      
      if (currentRetryCount > 1 || isRateLimit || (isTimeout && currentRetryCount > 0)) {
        setError(errMessage);
      }
      
      if (currentRetryCount < 3 && !isRateLimit) {
        const baseDelay = isTimeout ? 2000 : 1000;
        const retryDelay = Math.min(baseDelay * Math.pow(2, currentRetryCount), 30000);
        
        if (isMountedRef.current) {
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              fetchCMCData(true);
            }
          }, retryDelay);
        }
      }
    } finally {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      
      if (!isRetry && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [clearTimeouts]); // Only depend on clearTimeouts

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    const initialFetch = async () => {
      try {
        await fetchCMCData();
      } catch (error) {
        console.error('Initial CMC data fetch failed:', error);
      }
    };
    initialFetch();
    
    // Refresh every 5 minutes (300000ms)
    const interval = setInterval(async () => {
      if (isMountedRef.current) {
        try {
          await fetchCMCData();
        } catch (error) {
          console.error('Interval CMC data fetch failed:', error);
        }
      }
    }, 300000);
    
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      clearTimeouts();
    };
  }, [fetchCMCData, clearTimeouts]);

  // Manually retry and clear errors
  const retry = useCallback(() => {
    setError(null);
    setRetryCount(0);
    return fetchCMCData();
  }, [fetchCMCData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: retry
  };
} 