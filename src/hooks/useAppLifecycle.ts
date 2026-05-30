import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { requestQueue } from '../services/api/requestQueue';
import socketService from '../services/socket';
import syncService from '../services/syncService';
import { appLogger } from '../utils/logger';

/**
 * Centralises background/foreground lifecycle management.
 *
 * When the app moves to the background or becomes inactive:
 *   • The auto-sync interval is stopped.
 *   • The request-queue monitoring interval is stopped.
 *   • The WebSocket connection is disconnected.
 *
 * When the app returns to the foreground:
 *   • Auto-sync is restarted.
 *   • Request-queue monitoring is resumed (using the previously stored api client).
 *   • The WebSocket is reconnected.
 *
 * Skeleton shimmer animations are paused/resumed independently inside the
 * Skeleton component itself via its own AppState listener.
 */
export function useAppLifecycle(): void {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      const goingToBackground =
        prevState === 'active' && (nextState === 'background' || nextState === 'inactive');
      const returningToForeground =
        (prevState === 'background' || prevState === 'inactive') && nextState === 'active';

      if (goingToBackground) {
        appLogger.infoSync('[Lifecycle] App backgrounded — pausing timers & socket');
        syncService.stopAutoSync();
        requestQueue.stopMonitoring();
        socketService.disconnect();
      }

      if (returningToForeground) {
        appLogger.infoSync('[Lifecycle] App foregrounded — resuming timers & socket');
        syncService.startAutoSync();
        requestQueue.resumeMonitoring();
        socketService.connect();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);
}
