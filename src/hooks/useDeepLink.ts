import { useEffect, useState } from 'react';
import { getInitialDeepLink, subscribeToDeepLinks } from '../services/deepLinking';
import type { ParsedDeepLink } from '../utils/linkParser';

export function useDeepLink(
  onDeepLink?: (deepLink: ParsedDeepLink) => void
): { deepLink: ParsedDeepLink | null; hasDeepLink: boolean } {
  const [deepLink, setDeepLink] = useState<ParsedDeepLink | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const initial = await getInitialDeepLink();
      if (!isMounted || !initial) {
        return;
      }

      setDeepLink(initial);
      onDeepLink?.(initial);
    };

    initialize();

    const unsubscribe = subscribeToDeepLinks((payload) => {
      if (!isMounted) {
        return;
      }

      setDeepLink(payload);
      onDeepLink?.(payload);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [onDeepLink]);

  return {
    deepLink,
    hasDeepLink: deepLink !== null,
  };
}
