import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useRequestTimeout, REQUEST_TIMEOUT_MS } from '../../hooks/useRequestTimeout';

export interface RequestTimeoutOverlayProps {
  /** Whether a request is currently in-flight */
  loading: boolean;
  /** Called when the user taps Retry */
  onRetry: () => void;
  /** Timeout duration in ms (default: REQUEST_TIMEOUT_MS) */
  timeoutMs?: number;
  /** Label shown above the progress bar */
  message?: string;
}

/**
 * Shows a countdown progress bar while a request is in-flight.
 * When the timeout is reached, displays a Retry button.
 */
export function RequestTimeoutOverlay({
  loading,
  onRetry,
  timeoutMs = REQUEST_TIMEOUT_MS,
  message = 'Waiting for response…',
}: RequestTimeoutOverlayProps) {
  const { progress, remaining, isTimedOut, start, reset } =
    useRequestTimeout(timeoutMs);

  // Start countdown when loading begins, reset when it ends
  React.useEffect(() => {
    if (loading) {
      start();
    } else {
      reset();
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loading && !isTimedOut) return null;

  const secondsLeft = Math.ceil(remaining / 1000);

  const handleRetry = () => {
    reset();
    onRetry();
  };

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      {/* Message + countdown */}
      <Text style={styles.message}>
        {isTimedOut ? 'Request timed out' : message}
      </Text>
      {!isTimedOut && (
        <Text style={styles.countdown} accessibilityLabel={`${secondsLeft} seconds remaining`}>
          {secondsLeft}s
        </Text>
      )}

      {/* Progress bar */}
      <View style={styles.trackContainer} accessibilityRole="progressbar">
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Retry button — shown once timed out */}
      {isTimedOut && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry request"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  message: {
    color: '#e0e0e0',
    fontSize: 14,
    textAlign: 'center',
  },
  countdown: {
    color: '#f0a500',
    fontSize: 20,
    fontWeight: '700',
  },
  trackContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#f0a500',
    borderRadius: 3,
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#f0a500',
    borderRadius: 6,
  },
  retryText: {
    color: '#1a1a2e',
    fontWeight: '700',
    fontSize: 14,
  },
});
