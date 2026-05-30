/**
 * Lazy Loading Utilities
 *
 * Provides utilities for code splitting and lazy loading of heavy components
 * with performance tracking, error boundaries, and loading states.
 */

import React, { ComponentType, LazyExoticComponent, ReactNode, Suspense } from 'react';

/**
 * Performance metrics for lazy-loaded components
 */
export interface LazyLoadMetrics {
  componentName: string;
  loadStartTime: number;
  loadEndTime?: number;
  loadDurationMs?: number;
  renderStartTime?: number;
  renderEndTime?: number;
  renderDurationMs?: number;
  bundleSizeSaved?: number; // in KB
  status: 'pending' | 'loaded' | 'error';
  error?: Error;
}

class LazyLoadingTracker {
  private metrics: Map<string, LazyLoadMetrics> = new Map();

  startTracking(componentName: string): LazyLoadMetrics {
    const metric: LazyLoadMetrics = {
      componentName,
      loadStartTime: Date.now(),
      status: 'pending',
    };
    this.metrics.set(componentName, metric);
    return metric;
  }

  finishLoading(componentName: string): void {
    const metric = this.metrics.get(componentName);
    if (metric) {
      metric.loadEndTime = Date.now();
      metric.loadDurationMs = metric.loadEndTime - metric.loadStartTime;
      metric.status = 'loaded';
      console.log(`[LazyLoad] ${componentName} loaded in ${metric.loadDurationMs}ms`);
    }
  }

  recordError(componentName: string, error: Error): void {
    const metric = this.metrics.get(componentName);
    if (metric) {
      metric.error = error;
      metric.status = 'error';
      console.error(`[LazyLoad] ${componentName} failed to load:`, error);
    }
  }

  getMetrics(componentName: string): LazyLoadMetrics | undefined {
    return this.metrics.get(componentName);
  }

  getAllMetrics(): LazyLoadMetrics[] {
    return Array.from(this.metrics.values());
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

export const lazyLoadingTracker = new LazyLoadingTracker();

/**
 * Creates a lazy-loaded component with tracking and error handling
 *
 * @param componentName - Name of the component for tracking
 * @param componentLoader - Function that imports the component
 * @param displayName - Optional display name for debugging
 * @returns Lazy-loaded component
 */
export function createLazyComponent<P extends object>(
  componentName: string,
  componentLoader: () => Promise<{ default: ComponentType<P> }>,
  displayName?: string
): LazyExoticComponent<ComponentType<P>> {
  const tracker = lazyLoadingTracker;
  tracker.startTracking(componentName);

  const LazyComponent = React.lazy(async () => {
    try {
      const module = await componentLoader();
      tracker.finishLoading(componentName);
      return module;
    } catch (error) {
      tracker.recordError(componentName, error as Error);
      throw error;
    }
  });

  LazyComponent.displayName = displayName || `Lazy(${componentName})`;
  return LazyComponent;
}

export interface SuspenseWithFallbackProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error) => void;
}

/**
 * Error Boundary for lazy-loaded components
 */
class LazyLoadErrorBoundary extends React.Component<
  { children: ReactNode; onError?: (error: Error) => void; componentName?: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[LazyLoad] Error in ${this.props.componentName || 'component'}:`, error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 16,
            backgroundColor: '#fee',
            borderRadius: 4,
            borderLeftColor: '#f33',
            borderLeftWidth: 4,
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', color: '#c00' }}>Failed to load component</h4>
          <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
            {this.state.error?.message || 'Unknown error occurred'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper for Suspense with error boundary and fallback UI
 */
export function SuspenseWithFallback({
  children,
  fallback,
  componentName,
  onError,
}: SuspenseWithFallbackProps) {
  return (
    <LazyLoadErrorBoundary componentName={componentName} onError={onError}>
      <Suspense fallback={fallback || <LazyLoadingFallback componentName={componentName} />}>
        {children}
      </Suspense>
    </LazyLoadErrorBoundary>
  );
}

/**
 * Default loading fallback component
 */
export function LazyLoadingFallback({ componentName }: { componentName?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        minHeight: 200,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '4px solid #f0f0f0',
          borderTopColor: '#007AFF',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ marginTop: 16, color: '#666', fontSize: 14 }}>
        {componentName ? `Loading ${componentName}...` : 'Loading...'}
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Hook to track lazy loading metrics
 */
export function useLazyLoadMetrics(componentName: string): LazyLoadMetrics | undefined {
  return lazyLoadingTracker.getMetrics(componentName);
}

/**
 * Hook to get all lazy loading metrics
 */
export function useAllLazyLoadMetrics(): LazyLoadMetrics[] {
  const [metrics, setMetrics] = React.useState<LazyLoadMetrics[]>([]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics([...lazyLoadingTracker.getAllMetrics()]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return metrics;
}
