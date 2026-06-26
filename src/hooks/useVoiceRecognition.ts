import { useCallback } from 'react';

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

export function useVoiceRecognition(
  options: UseVoiceRecognitionOptions = {}
): UseVoiceRecognitionReturn {
  return {
    isListening: false,
    transcript: '',
    isAvailable: false,
    error: null,
    startListening: useCallback(async () => {}, []),
    stopListening: useCallback(() => {}, []),
    resetTranscript: useCallback(() => {}, []),
    requestPermission: useCallback(async () => false, []),
  };
}
