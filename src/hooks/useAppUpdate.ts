import { useCallback, useEffect } from 'react';
import updateService from '../services/updateService';
import { useUpdateStore } from '../store/updateStore';
import logger from '../utils/logger';

/** Re-prompt cooldown: don't show the prompt again within 24 hours of a dismiss */
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Minimum interval between automatic checks: 30 minutes */
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function useAppUpdate() {
  const {
    status,
    updateInfo,
    error,
    isPromptVisible,
    lastCheckedAt,
    lastDismissedAt,
    setStatus,
    setUpdateInfo,
    setError,
    showPrompt,
    hidePrompt,
    setLastCheckedAt,
    setLastDismissedAt,
  } = useUpdateStore();

  /**
   * Run the full update check. Shows the prompt if an update is found
   * and the user hasn't recently dismissed it.
   */
  const checkForUpdate = useCallback(async () => {
    // Throttle: skip if checked recently
    if (lastCheckedAt) {
      const elapsed = Date.now() - new Date(lastCheckedAt).getTime();
      if (elapsed < CHECK_INTERVAL_MS) {
        logger.debug('[useAppUpdate] Skipping check — checked recently');
        return;
      }
    }

    setStatus('checking');
    setError(null);

    const result = await updateService.checkForUpdate();
    setLastCheckedAt(new Date().toISOString());

    if (result.status === 'available' && result.info) {
      setStatus('available');
      setUpdateInfo(result.info);

      // Respect dismiss cooldown
      if (lastDismissedAt) {
        const elapsed = Date.now() - new Date(lastDismissedAt).getTime();
        if (elapsed < DISMISS_COOLDOWN_MS) {
          logger.info('[useAppUpdate] Update available but prompt suppressed (cooldown)');
          return;
        }
      }

      showPrompt();
    } else if (result.status === 'error') {
      setStatus('error');
      setError(result.error ?? 'Update check failed');
    } else {
      setStatus('up-to-date');
    }
  }, [lastCheckedAt, lastDismissedAt, setStatus, setError, setUpdateInfo, setLastCheckedAt, showPrompt]);

  /**
   * Download and apply the update. The app will reload automatically.
   */
  const applyUpdate = useCallback(async () => {
    setStatus('downloading');
    hidePrompt();

    const downloaded = await updateService.downloadUpdate();
    if (!downloaded) {
      setStatus('error');
      setError('Failed to download update. Please try again later.');
      return;
    }

    setStatus('ready');
    await updateService.applyUpdate();
    // App reloads here — code below won't execute
  }, [setStatus, setError, hidePrompt]);

  /**
   * User dismissed the prompt.
   */
  const dismissUpdate = useCallback(() => {
    updateService.trackDismissed();
    setLastDismissedAt(new Date().toISOString());
    hidePrompt();
  }, [setLastDismissedAt, hidePrompt]);

  // Auto-check on mount (app launch)
  useEffect(() => {
    checkForUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    updateInfo,
    error,
    isPromptVisible,
    checkForUpdate,
    applyUpdate,
    dismissUpdate,
  };
}
