import React, { ComponentType, lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

const Fallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
);

export function lazyScreen<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.FC<React.ComponentProps<T>> {
  const LazyComponent = lazy(factory);
  return (props) => (
    <Suspense fallback={<Fallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}
