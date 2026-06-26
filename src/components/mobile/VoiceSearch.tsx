import { Mic, Square } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import * as hooks from '../../hooks';

export interface VoiceSearchProps {
  onTranscript: (text: string) => void;
  onTranscriptFinal?: (text: string) => void;
  disabled?: boolean;
  /** Renders a compact mic-only button for inline use inside a search input */
  compact?: boolean;
}

export const VoiceSearch = ({
  onTranscript,
  onTranscriptFinal,
  disabled = false,
  compact = false,
}: VoiceSearchProps) => {
  const useVoiceRecognition =
    typeof hooks.useVoiceRecognition === 'function'
      ? hooks.useVoiceRecognition
      : () => ({
          isListening: false,
          transcript: '',
          isAvailable: false,
          error: null as string | null,
          startListening: () => undefined,
          stopListening: () => undefined,
          resetTranscript: () => undefined,
        });

  const {
    isListening,
    transcript,
    isAvailable,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition({
    lang: 'en-US',
    interimResults: true,
    continuous: false,
    onResult(text, isFinal) {
      onTranscript(text);
      if (isFinal && text.trim()) onTranscriptFinal?.(text.trim());
    },
  });

  // Push transcript to parent when it changes
  useEffect(() => {
    if (transcript) onTranscript(transcript);
  }, [transcript, onTranscript]);

  if (!isAvailable && !error) {
    return null;
  }

  const handlePress = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim()) onTranscriptFinal?.(transcript.trim());
    } else {
      resetTranscript();
      startListening();
    }
  };

  if (compact) {
    if (!isAvailable && !error) return null;
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        className={`p-2.5 justify-center items-center ${disabled ? 'opacity-50' : ''}`}
        accessibilityLabel={isListening ? 'Stop voice search' : 'Start voice search'}
        activeOpacity={0.8}
      >
        {isListening ? (
          <Square size={18} color="#19c3e6" fill="#19c3e6" />
        ) : (
          <Mic size={20} color="#9CA3AF" />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View className="items-center">
      {error ? (
        <Text className="text-[11px] text-red-500 mb-1 text-center max-w-[140px]" numberOfLines={2}>
          {error}
        </Text>
      ) : null}
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        className={`flex-row items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl min-w-[88px] ${
          isListening ? 'bg-[#19c3e6]' : 'bg-gray-100'
        } ${disabled ? 'opacity-50' : ''}`}
        activeOpacity={0.8}
      >
        {isListening ? (
          <>
            <Square size={20} color="#fff" fill="#fff" />
            <Text className="text-sm font-semibold text-white">Stop</Text>
          </>
        ) : (
          <>
            <Mic size={22} color={isAvailable ? '#19c3e6' : '#9CA3AF'} />
            <Text
              className={`text-sm font-semibold ${
                isAvailable ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              Voice
            </Text>
          </>
        )}
      </TouchableOpacity>
      {isListening && (
        <View className="flex-row items-center gap-2 mt-2 px-3 py-1.5 bg-sky-100 rounded-lg max-w-full">
          <ActivityIndicator size="small" color="#19c3e6" />
          <Text className="text-[13px] text-sky-700 flex-1" numberOfLines={1}>
            {transcript || 'Listening...'}
          </Text>
        </View>
      )}
    </View>
  );
};

