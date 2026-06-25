import { useState, useCallback, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';

import { clipboardService, ClipboardOperationMetrics } from '../services/clipboardService';

export interface UseOptimizedClipboardResult {
  isCopying: boolean;
  isPasting: boolean;
  copySuccess: boolean;
  error: Error | null;
  clipboardContent: string;
  metrics: ClipboardOperationMetrics | null;
  copyToClipboard: (text: string) => Promise<boolean>;
  pasteFromClipboard: () => Promise<string>;
  clearError: () => void;
}

export function useOptimizedClipboard(): UseOptimizedClipboardResult {
  const [isCopying, setIsCopying] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [clipboardContent, setClipboardContent] = useState('');
  const [metrics, setMetrics] = useState<ClipboardOperationMetrics | null>(null);
  
  const isMounted = useRef(true);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    if (!isMounted.current) return false;

    // Reset previous success and error states
    setCopySuccess(false);
    setError(null);
    setIsCopying(true);

    // Defer the heavy native copy operation to allow React to render the loading spinner
    return new Promise<boolean>((resolve) => {
      // 1. Run after any ongoing screen animations or interactions
      InteractionManager.runAfterInteractions(() => {
        // 2. Wrap in setTimeout(..., 0) to ensure React state update is flushed and rendered first
        setTimeout(async () => {
          try {
            const success = await clipboardService.copyToClipboardAsync(text);
            
            if (isMounted.current) {
              setIsCopying(false);
              setCopySuccess(success);
              setMetrics(clipboardService.getLastMetrics());
              
              // Automatically reset copy success toast after 2 seconds
              if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
              successTimeoutRef.current = setTimeout(() => {
                if (isMounted.current) {
                  setCopySuccess(false);
                }
              }, 2000);
            }
            resolve(success);
          } catch (err) {
            if (isMounted.current) {
              setIsCopying(false);
              setError(err instanceof Error ? err : new Error(String(err)));
            }
            resolve(false);
          }
        }, 0);
      });
    });
  }, []);

  const pasteFromClipboard = useCallback(async (): Promise<string> => {
    if (!isMounted.current) return '';

    setError(null);
    setIsPasting(true);

    return new Promise<string>((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(async () => {
          try {
            const content = await clipboardService.pasteFromClipboardAsync();
            
            if (isMounted.current) {
              setIsPasting(false);
              setClipboardContent(content);
              setMetrics(clipboardService.getLastMetrics());
            }
            resolve(content);
          } catch (err) {
            if (isMounted.current) {
              setIsPasting(false);
              setError(err instanceof Error ? err : new Error(String(err)));
            }
            resolve('');
          }
        }, 0);
      });
    });
  }, []);

  return {
    isCopying,
    isPasting,
    copySuccess,
    error,
    clipboardContent,
    metrics,
    copyToClipboard,
    pasteFromClipboard,
    clearError,
  };
}
