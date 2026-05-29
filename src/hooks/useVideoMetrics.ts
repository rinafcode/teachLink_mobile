import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { appLogger } from '@/utils/logger';

export interface VideoMetrics {
  loadTime: number;
  bufferingCount: number;
  totalBufferingTime: number;
  playbackErrors: number;
}

const initialMetrics: VideoMetrics = {
  loadTime: 0,
  bufferingCount: 0,
  totalBufferingTime: 0,
  playbackErrors: 0,
};

export function useVideoMetrics() {
  const [metrics, setMetrics] = useState<VideoMetrics>(initialMetrics);
  const bufferingStartRef = useRef<number | null>(null);
  const mountedAtRef = useRef<number>(Date.now());
  const hasRecordedFirstPlayRef = useRef(false);

  const recordBufferingStart = useCallback(() => {
    if (bufferingStartRef.current == null) {
      bufferingStartRef.current = Date.now();
      setMetrics(currentMetrics => ({
        ...currentMetrics,
        bufferingCount: currentMetrics.bufferingCount + 1,
      }));
    }
  }, []);

  const recordBufferingEnd = useCallback(() => {
    if (bufferingStartRef.current != null) {
      const elapsed = Date.now() - bufferingStartRef.current;
      bufferingStartRef.current = null;
      setMetrics(currentMetrics => ({
        ...currentMetrics,
        totalBufferingTime: currentMetrics.totalBufferingTime + elapsed,
      }));
    }
  }, []);

  const recordLoadComplete = useCallback(() => {
    if (!hasRecordedFirstPlayRef.current) {
      hasRecordedFirstPlayRef.current = true;
      setMetrics(currentMetrics => ({
        ...currentMetrics,
        loadTime: Date.now() - mountedAtRef.current,
      }));
    }
  }, []);

  const recordError = useCallback((errorMessage: string) => {
    setMetrics(currentMetrics => ({
      ...currentMetrics,
      playbackErrors: currentMetrics.playbackErrors + 1,
    }));
    appLogger.error('Video playback error', { errorMessage });
  }, []);

  const resetMetrics = useCallback(() => {
    bufferingStartRef.current = null;
    hasRecordedFirstPlayRef.current = false;
    mountedAtRef.current = Date.now();
    setMetrics(initialMetrics);
  }, []);

  useEffect(() => {
    appLogger.debug('Video metrics updated', { metrics });
  }, [metrics]);

  useEffect(() => {
    return () => {
      appLogger.info('Video metrics summary', metrics);
    };
  }, [metrics]);

  return useMemo(
    () => ({
      metrics,
      recordBufferingStart,
      recordBufferingEnd,
      recordLoadComplete,
      recordError,
      resetMetrics,
    }),
    [
      metrics,
      recordBufferingEnd,
      recordBufferingStart,
      recordError,
      recordLoadComplete,
      resetMetrics,
    ]
  );
}
