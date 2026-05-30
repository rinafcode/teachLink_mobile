import React, { ComponentType } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { createLazyRoute } from './lazyRoute';

type DynamicImport<T extends ComponentType<any>> = () => Promise<{ default: T }>;

const DefaultLoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
  </View>
);

/**
 * @deprecated Prefer `createLazyRoute` with an explicit skeleton fallback.
 */
export function lazyScreen<T extends ComponentType<any>>(
  importFn: DynamicImport<T>,
  boundaryName = 'LazyScreen'
): T {
  return createLazyRoute({
    importFn,
    LoadingFallback: DefaultLoadingFallback,
    boundaryName,
  });
}
