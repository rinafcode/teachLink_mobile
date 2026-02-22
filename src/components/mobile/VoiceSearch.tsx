import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';

export interface VoiceSearchProps {
  onTranscript: (text: string) => void;
  onTranscriptFinal?: (text: string) => void;
  disabled?: boolean;
}

export function VoiceSearch({
  onTranscript,
  onTranscriptFinal,
  disabled = false,
}: VoiceSearchProps) {
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

  return (
    <View style={styles.wrapper}>
      {error ? (
        <Text style={styles.error} numberOfLines={2}>
          {error}
        </Text>
      ) : null}
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[styles.button, isListening && styles.buttonActive, disabled && styles.buttonDisabled]}
        activeOpacity={0.8}
      >
        {isListening ? (
          <>
            <Square size={20} color="#fff" fill="#fff" />
            <Text style={styles.buttonLabel}>Stop</Text>
          </>
        ) : (
          <>
            <Mic size={22} color={isAvailable ? '#19c3e6' : '#9CA3AF'} />
            <Text style={[styles.buttonLabel, !isAvailable && styles.buttonLabelMuted]}>
              Voice
            </Text>
          </>
        )}
      </TouchableOpacity>
      {isListening && (
        <View style={styles.listeningBar}>
          <ActivityIndicator size="small" color="#19c3e6" />
          <Text style={styles.listeningText} numberOfLines={1}>
            {transcript || 'Listening...'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    minWidth: 88,
  },
  buttonActive: {
    backgroundColor: '#19c3e6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  buttonLabelMuted: {
    color: '#9CA3AF',
  },
  error: {
    fontSize: 11,
    color: '#EF4444',
    marginBottom: 4,
    textAlign: 'center',
    maxWidth: 140,
  },
  listeningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    maxWidth: '100%',
  },
  listeningText: {
    fontSize: 13,
    color: '#0369A1',
    flex: 1,
  },
});
