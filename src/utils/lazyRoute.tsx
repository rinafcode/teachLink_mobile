import React, { ComponentType, lazy, Suspense } from 'react';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';

type DynamicImport<T extends ComponentType<any>> = () => Promise<{ default: T }>;

/** In dev, set EXPO_PUBLIC_LAZY_LOAD_DELAY_MS (e.g. 1500) to hold the skeleton visible while demoing. */
function withOptionalDevDelay<T extends ComponentType<any>>(
  importFn: DynamicImport<T>
): DynamicImport<T> {
  const delayMs = Number(process.env.EXPO_PUBLIC_LAZY_LOAD_DELAY_MS ?? 0);
  if (!__DEV__ || !delayMs || delayMs <= 0) {
    return importFn;
  }

  return () =>
    Promise.all([importFn(), new Promise(resolve => setTimeout(resolve, delayMs))]).then(
      ([module]) => module
    );
}

export interface CreateLazyRouteOptions<T extends ComponentType<any>> {
  importFn: DynamicImport<T>;
  LoadingFallback: ComponentType;
  boundaryName: string;
}

/**
 * Creates a code-split route component with Suspense loading UI and an error boundary.
 * Use in Expo Router `app/` files to defer heavy screen modules until navigation.
 */
export function createLazyRoute<T extends ComponentType<any>>({
  importFn,
  LoadingFallback,
  boundaryName,
}: CreateLazyRouteOptions<T>): T {
  const LazyComponent = lazy(withOptionalDevDelay(importFn));

  const LazyRoute = (props: React.ComponentProps<T>) => (
    <ErrorBoundary boundaryName={boundaryName}>
      <Suspense fallback={<LoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  LazyRoute.displayName = `LazyRoute(${boundaryName})`;

  return LazyRoute as T;
}
