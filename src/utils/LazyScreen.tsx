import React, { ComponentType, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

type DynamicImport<T> = () => Promise<{ default: T }>;

/**
 * Wraps a dynamic import with React.lazy and Suspense for code splitting.
 * Compatible with expo-router's Metro bundler code splitting.
 */
export function lazyScreen<T extends ComponentType<any>>(
  importFn: DynamicImport<T>
): T {
  const LazyComponent = React.lazy(importFn);

  const Wrapper = (props: React.ComponentProps<T>) => (
    <Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      }
    >
      <LazyComponent {...(props as any)} />
    </Suspense>
  );

  return Wrapper as unknown as T;
}
