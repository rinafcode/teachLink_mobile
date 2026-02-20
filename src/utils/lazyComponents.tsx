import React, { ComponentType, lazy, Suspense } from 'react';

/**
 * Utility for creating code-split / lazy-loaded React components in React Native.
 * This helps reduce the initial JavaScript bundle size by deferring the loading 
 * of heavy screens or non-critical components until they are actually rendered.
 *
 * @param factory A function that dynamically imports a component
 * @param FallbackComponent Optional component to show while loading (e.g. ActivityIndicator)
 * @returns A lazily loaded component wrapped in a Suspense boundary
 */
export function createLazyComponent<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
    FallbackComponent?: React.ReactNode
): T {
    const LazyComponent = lazy(factory);

    // Return a generic functional component that wraps the LazyComponent in Suspense
    const WrapperComponent = (props: React.ComponentProps<T>) => (
        <Suspense fallback= { FallbackComponent || null
}>
    <LazyComponent { ...props } />
    </Suspense>
  );

// Explicit type cast to match the original component props
return WrapperComponent as unknown as T;
}
