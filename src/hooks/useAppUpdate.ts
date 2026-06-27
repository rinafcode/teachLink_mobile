import { useCallback, useEffect, useRef, useState } from 'react';

import { appUpdateService, UpdateCheckResult, UpdateType } from '../services/appUpdateService';
import { appLogger } from '../utils/logger';

export interface UseAppUpdateState {
  isChecking: boolean;
  isDownloading: boolean;
  checkResult: UpdateCheckResult | null;
  error: string | null;
}

export interface UseAppUpdateActions {
  checkForUpdate: () => Promise<void>;
  applyUpdate: () => Promise<void>;
  openStore: () => Promise<void>;
  dismiss: () => void;
}

export type UseAppUpdateResult = UseAppUpdateState & UseAppUpdateActions;

export function useAppUpdate(checkOnMount = false): UseAppUpdateResult {
  const [state, setState] = useState<UseAppUpdateState>({
    isChecking: false,
    isDownloading: false,
    checkResult: null,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (!mountedRef.current) return;

    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const result = await appUpdateService.checkForUpdate();
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isChecking: false, checkResult: result }));
      }
    } catch (err) {
      appLogger.error('useAppUpdate: checkForUpdate failed', err);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isChecking: false,
          error: err instanceof Error ? err.message : 'Update check failed',
        }));
      }
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    if (!mountedRef.current) return;

    setState(prev => ({ ...prev, isDownloading: true, error: null }));

    try {
      const success = await appUpdateService.downloadAndApplyOtaUpdate();
      if (mountedRef.current && !success) {
        setState(prev => ({
          ...prev,
          isDownloading: false,
          error: 'Update could not be applied. Please try again.',
        }));
      }
    } catch (err) {
      appLogger.error('useAppUpdate: applyUpdate failed', err);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isDownloading: false,
          error: err instanceof Error ? err.message : 'Update failed',
        }));
      }
    }
  }, []);

  const openStore = useCallback(async () => {
    await appUpdateService.openStoreForUpdate();
  }, []);

  const dismiss = useCallback(() => {
    const updateType: UpdateType = state.checkResult?.updateType ?? 'none';
    appUpdateService.trackDismissed(updateType);
    setState(prev => ({ ...prev, checkResult: null, error: null }));
  }, [state.checkResult?.updateType]);

  useEffect(() => {
    if (checkOnMount && appUpdateService.shouldCheck()) {
      checkForUpdate();
    }
  }, [checkOnMount, checkForUpdate]);

  return {
    ...state,
    checkForUpdate,
    applyUpdate,
    openStore,
    dismiss,
  };
}
