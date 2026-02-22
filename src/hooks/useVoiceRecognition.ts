import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseVoiceRecognitionOptions {
  lang?: string;
  interimResults?: boolean;
  continuous?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string, message?: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface UseVoiceRecognitionReturn {
  isListening: boolean;
  transcript: string;
  isAvailable: boolean;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  requestPermission: () => Promise<boolean>;
}

let speechModule: typeof import('expo-speech-recognition') | null = null;
let moduleLoadAttempted = false;

async function loadSpeechModule(): Promise<typeof import('expo-speech-recognition') | null> {
  if (moduleLoadAttempted) return speechModule;
  moduleLoadAttempted = true;
  try {
    speechModule = await import('expo-speech-recognition');
    return speechModule;
  } catch {
    return null;
  }
}

/**
 * Hook for voice recognition (speech-to-text).
 * Uses expo-speech-recognition when available; degrades gracefully when not
 * (e.g. Expo Go without dev build). Add expo-speech-recognition plugin to app.json
 * and run a development build for full voice support.
 */
export function useVoiceRecognition(
  options: UseVoiceRecognitionOptions = {}
): UseVoiceRecognitionReturn {
  const {
    lang = 'en-US',
    interimResults = true,
    continuous = false,
    onResult,
    onError,
    onStart,
    onEnd,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accumulatedTranscript = useRef('');
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const mod = await loadSpeechModule();
    if (!mod) {
      setError('Voice recognition is not available');
      return false;
    }
    try {
      const result = await mod.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        setError('Microphone permission denied');
        return false;
      }
      setIsAvailable(true);
      setError(null);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Permission request failed';
      setError(msg);
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    const mod = await loadSpeechModule();
    if (!mod) {
      setError('Voice recognition is not available. Use a development build for voice search.');
      return;
    }
    setError(null);
    accumulatedTranscript.current = '';
    setTranscript('');
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;
      mod.ExpoSpeechRecognitionModule.start({
        lang,
        interimResults,
        continuous,
        iosTaskHint: 'search',
      });
      setIsListening(true);
      onStart?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start';
      setError(msg);
      onError?.(msg);
    }
  }, [lang, interimResults, continuous, requestPermission, onStart, onError]);

  const stopListening = useCallback(() => {
    if (speechModule) {
      try {
        speechModule.ExpoSpeechRecognitionModule.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    onEnd?.();
  }, [onEnd]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    accumulatedTranscript.current = '';
  }, []);

  // Load module, check availability, and subscribe to events
  useEffect(() => {
    let mounted = true;
    let subscriptions: { remove: () => void }[] = [];

    loadSpeechModule().then((mod) => {
      if (!mounted || !mod) return;
      const availability = mod.ExpoSpeechRecognitionModule.isRecognitionAvailable();
      const availabilityPromise =
        typeof availability === 'boolean' ? Promise.resolve(availability) : availability;
      availabilityPromise.then((available: boolean) => {
        if (mounted) setIsAvailable(available);
      });

      const startSub = mod.ExpoSpeechRecognitionModule.addListener('start', () => {
        if (mounted) {
          setIsListening(true);
          optionsRef.current.onStart?.();
        }
      });
      const endSub = mod.ExpoSpeechRecognitionModule.addListener('end', () => {
        if (mounted) {
          setIsListening(false);
          optionsRef.current.onEnd?.();
        }
      });
      const resultSub = mod.ExpoSpeechRecognitionModule.addListener(
        'result',
        (event: { results?: Array<{ transcript?: string }>; isFinal?: boolean }) => {
          if (!mounted) return;
          const text = (event.results?.[0]?.transcript ?? '').trim();
          if (event.isFinal && text) {
            accumulatedTranscript.current = (accumulatedTranscript.current + ' ' + text).trim();
            setTranscript(accumulatedTranscript.current);
            optionsRef.current.onResult?.(accumulatedTranscript.current, true);
          } else if (text) {
            const current = (accumulatedTranscript.current + ' ' + text).trim();
            setTranscript(current);
            optionsRef.current.onResult?.(current, false);
          }
        }
      );
      const errSub = mod.ExpoSpeechRecognitionModule.addListener(
        'error',
        (event: { error?: string; message?: string }) => {
          if (!mounted) return;
          const msg = event.message || event.error || 'Recognition error';
          setError(msg);
          setIsListening(false);
          optionsRef.current.onError?.(msg, event.message);
        }
      );
      subscriptions = [startSub, endSub, resultSub, errSub];
    });

    return () => {
      mounted = false;
      subscriptions.forEach((s) => s.remove());
    };
  }, []);

  return {
    isListening,
    transcript,
    isAvailable,
    error,
    startListening,
    stopListening,
    resetTranscript,
    requestPermission,
  };
}
