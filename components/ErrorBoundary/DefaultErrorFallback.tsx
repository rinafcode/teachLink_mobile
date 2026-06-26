import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

/**
 * Props for {@link DefaultErrorFallback}.
 */
export interface DefaultErrorFallbackProps {
  /** The error that caused the boundary to give up after exhausting its retries. */
  error: Error;
  /** Resets the boundary and re-renders the child tree. Wired to the "Try Again" button. */
  onRetry: () => void;
}

/**
 * Generic fallback UI rendered by {@link RetryErrorBoundary} once automatic retries
 * are exhausted. It deliberately avoids leaking raw error details to end users in
 * production; the underlying message is only surfaced in development (`__DEV__`).
 */
export const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({ error, onRetry }) => {
  return (
    <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-slate-900">
      <View className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <Text className="mb-2 text-xl font-bold text-red-600 dark:text-red-400">
          Something went wrong
        </Text>
        <Text className="mb-4 text-base text-slate-600 dark:text-slate-300">
          We could not display this section. Please try again.
        </Text>

        {__DEV__ ? (
          <ScrollView className="mb-4 max-h-40 rounded-lg bg-slate-100 p-3 dark:bg-slate-950">
            <Text className="font-mono text-xs text-red-700 dark:text-red-300">
              {error.message}
            </Text>
          </ScrollView>
        ) : null}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Try again"
          className="items-center rounded-lg bg-sky-500 py-3"
          onPress={onRetry}
        >
          <Text className="text-base font-semibold text-white">Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DefaultErrorFallback;
