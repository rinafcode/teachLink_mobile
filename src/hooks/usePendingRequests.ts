import { useEffect, useState } from 'react';
import requestQueue from '../services/api/requestQueue';

/**
 * Hook to get the number of pending offline requests
 */
export function usePendingRequests() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Get initial count
    requestQueue.getPendingCount().then(setPendingCount);

    // Listen for changes
    const unsubscribe = requestQueue.onPendingCountChange(setPendingCount);

    return unsubscribe;
  }, []);

  return pendingCount;
}