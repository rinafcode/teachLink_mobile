import { useEffect, useState } from 'react';
import requestQueue, { RequestPriority } from '../services/api/requestQueue';

export function usePendingRequests(priority?: RequestPriority) {
  const [pendingCount, setPendingCount] = useState(0);
  const [byPriority, setByPriority] = useState<
    Record<RequestPriority, number>
  >({
    critical: 0,
    high: 0,
    normal: 0,
    low: 0,
  });

  useEffect(() => {
    const update = async () => {
      if (priority) {
        const counts = await requestQueue.getPendingByPriority();
        setByPriority(counts);
        setPendingCount(counts[priority]);
      } else {
        const count = await requestQueue.getPendingCount();
        setPendingCount(count);
      }
    };

    update();

    const unsubscribe = requestQueue.onPendingCountChange(() => {
      update();
    });

    return unsubscribe;
  }, [priority]);

  if (priority) {
    return { pendingCount, byPriority };
  }

  return pendingCount;
}
