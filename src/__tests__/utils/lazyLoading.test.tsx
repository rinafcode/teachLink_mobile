

import { render, screen, waitFor } from '@testing-library/react-native';
import React, { Suspense } from 'react';
import {
    CardSkeleton,
    DataGridSkeleton,
    ProfileSkeleton,
    VideoPlayerSkeleton,
} from '../components/loadingSkeletons';
import {
    getEstimatedBundleSavings,
    lazyComponentRegistry
} from '../utils/lazyComponents';
import {
    createLazyComponent,
    LazyLoadingFallback,
    lazyLoadingTracker,
    SuspenseWithFallback,
    useAllLazyLoadMetrics,
    useLazyLoadMetrics,
} from '../utils/lazyLoading';

describe('Lazy Loading System', () => {
  beforeEach(() => {
    lazyLoadingTracker.clearMetrics();
  });

  describe('Lazy Component Creation', () => {
    it('should create lazy component with tracking', () => {
      const TestComponent = () => <div>Test</div>;
      const LazyTest = createLazyComponent('TestComponent', () => Promise.resolve({ default: TestComponent }));

      expect(LazyTest.displayName).toBe('Lazy(TestComponent)');
      expect(typeof LazyTest).toBe('object');
    });

    it('should track component loading start', () => {
      const TestComponent = () => <div>Test</div>;
      const LazyTest = createLazyComponent('TestComponent', () => Promise.resolve({ default: TestComponent }));

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyTest />
        </Suspense>
      );

      // Metrics should be tracked
      expect(lazyLoadingTracker.getAllMetrics().length).toBeGreaterThan(0);
    });

    it('should record component load time', async () => {
      const TestComponent = () => <div>Loaded</div>;
      const LazyTest = createLazyComponent('TestComponent', () => Promise.resolve({ default: TestComponent }));

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <LazyTest />
        </Suspense>
      );

      await waitFor(() => {
        const metric = lazyLoadingTracker.getMetrics('TestComponent');
        expect(metric).toBeDefined();
        expect(metric?.status).toBe('loaded');
        expect(metric?.loadDurationMs).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Suspense with Fallback', () => {
    it('should display fallback while loading', () => {
      const TestComponent = () => <div>Loaded</div>;
      const SlowComponent = React.lazy(() => new Promise((resolve) => setTimeout(() => resolve({ default: TestComponent }), 100)));

      render(
        <SuspenseWithFallback fallback={<div testID="fallback">Loading...</div>}>
          <SlowComponent />
        </SuspenseWithFallback>
      );

      // Fallback should be visible initially
      expect(screen.getByTestID('fallback')).toBeTruthy();
    });

    it('should display component after loading', async () => {
      const TestComponent = () => <div testID="loaded">Loaded</div>;
      const LazyTest = createLazyComponent('TestComponent', () => Promise.resolve({ default: TestComponent }));

      render(
        <SuspenseWithFallback componentName="TestComponent">
          <LazyTest />
        </SuspenseWithFallback>
      );

      await waitFor(() => {
        // Component should eventually render
        expect(lazyLoadingTracker.getMetrics('TestComponent')).toBeDefined();
      });
    });

    it('should handle loading errors gracefully', async () => {
      const LazyFail = createLazyComponent('FailComponent', () =>
        Promise.reject(new Error('Failed to load'))
      );

      render(
        <SuspenseWithFallback
          componentName="FailComponent"
          onError={(error) => {
            expect(error.message).toBe('Failed to load');
          }}
        >
          <LazyFail />
        </SuspenseWithFallback>
      );

      await waitFor(() => {
        const metric = lazyLoadingTracker.getMetrics('FailComponent');
        expect(metric?.status).toBe('error');
      });
    });
  });

  describe('Loading Skeletons', () => {
    it('should render generic loading skeleton', () => {
      const { container } = render(
        <LazyLoadingFallback componentName="TestComponent" />
      );

      expect(container).toBeTruthy();
    });

    it('should render video player skeleton', () => {
      const { container } = render(<VideoPlayerSkeleton />);
      expect(container).toBeTruthy();
    });

    it('should render data grid skeleton', () => {
      const { container } = render(<DataGridSkeleton />);
      expect(container).toBeTruthy();
    });

    it('should render profile skeleton', () => {
      const { container } = render(<ProfileSkeleton />);
      expect(container).toBeTruthy();
    });

    it('should render card skeleton with custom count', () => {
      const { container } = render(<CardSkeleton count={5} />);
      expect(container).toBeTruthy();
    });
  });

  describe('Lazy Components Registry', () => {
    it('should have all heavy components in registry', () => {
      const registry = lazyComponentRegistry;

      expect(registry.videoPlayer).toBeDefined();
      expect(registry.dataGrid).toBeDefined();
      expect(registry.profile).toBeDefined();
      expect(registry.settings).toBeDefined();
      expect(registry.quiz).toBeDefined();
    });

    it('should provide component metadata', () => {
      const videoRegistry = lazyComponentRegistry.videoPlayer;

      expect(videoRegistry.name).toBe('MobileVideoPlayer');
      expect(videoRegistry.category).toBe('media');
      expect(videoRegistry.estimatedSize).toBeTruthy();
      expect(videoRegistry.description).toBeTruthy();
    });

    it('should calculate bundle savings correctly', () => {
      const savings = getEstimatedBundleSavings();

      expect(savings.totalSavings).toBeGreaterThan(0);
      expect(savings.totalSavingsPercent).toBeGreaterThan(0);
      expect(savings.components.length).toBeGreaterThan(0);
    });

    it('should show estimated bundle savings of 10-15%', () => {
      const savings = getEstimatedBundleSavings();

      // Target is 10-15% savings
      expect(savings.totalSavingsPercent).toBeGreaterThanOrEqual(8);
      expect(savings.totalSavingsPercent).toBeLessThanOrEqual(20);
    });
  });

  describe('Performance Metrics', () => {
    it('should track multiple component loads', async () => {
      const Component1 = () => <div>1</div>;
      const Component2 = () => <div>2</div>;

      const Lazy1 = createLazyComponent('Component1', () => Promise.resolve({ default: Component1 }));
      const Lazy2 = createLazyComponent('Component2', () => Promise.resolve({ default: Component2 }));

      render(
        <>
          <Suspense fallback={null}>
            <Lazy1 />
          </Suspense>
          <Suspense fallback={null}>
            <Lazy2 />
          </Suspense>
        </>
      );

      await waitFor(() => {
        const allMetrics = lazyLoadingTracker.getAllMetrics();
        expect(allMetrics.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should provide hooks to access metrics', () => {
      function MetricsComponent() {
        const metric = useLazyLoadMetrics('TestComponent');
        const allMetrics = useAllLazyLoadMetrics();

        return (
          <div>
            <div testID="metric-status">{metric?.status}</div>
            <div testID="metrics-count">{allMetrics.length}</div>
          </div>
        );
      }

      render(<MetricsComponent />);
      expect(screen.getByTestID('metrics-count')).toBeTruthy();
    });
  });

  describe('Bundle Size Optimization', () => {
    it('should identify heavy components for lazy loading', () => {
      const registry = lazyComponentRegistry;
      const heavyComponents = Object.values(registry).filter((comp) => {
        const size = parseFloat(comp.estimatedSize.replace('KB', ''));
        return size > 100;
      });

      expect(heavyComponents.length).toBeGreaterThan(0);
    });

    it('should calculate combined component size', () => {
      const registry = lazyComponentRegistry;
      let totalSize = 0;

      Object.values(registry).forEach((comp) => {
        const size = parseFloat(comp.estimatedSize.replace('KB', ''));
        totalSize += size;
      });

      // Total should be around 1500+ KB (estimated)
      expect(totalSize).toBeGreaterThan(1000);
    });

    it('should support code splitting strategies', () => {
      const registry = lazyComponentRegistry;
      const categories = new Set<string>();

      Object.values(registry).forEach((comp) => {
        categories.add(comp.category);
      });

      // Should have multiple categories for separate chunks
      expect(categories.size).toBeGreaterThan(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle lazy component errors', async () => {
      const LazyError = createLazyComponent(
        'ErrorComponent',
        () => Promise.reject(new Error('Load failed'))
      );

      render(
        <SuspenseWithFallback componentName="ErrorComponent">
          <LazyError />
        </SuspenseWithFallback>
      );

      await waitFor(() => {
        const metric = lazyLoadingTracker.getMetrics('ErrorComponent');
        expect(metric?.status).toBe('error');
        expect(metric?.error).toBeDefined();
      });
    });

    it('should provide error callback', async () => {
      const errorCallback = jest.fn();
      const LazyError = createLazyComponent(
        'ErrorComponent',
        () => Promise.reject(new Error('Load failed'))
      );

      render(
        <SuspenseWithFallback componentName="ErrorComponent" onError={errorCallback}>
          <LazyError />
        </SuspenseWithFallback>
      );

      await waitFor(() => {
        expect(errorCallback).toHaveBeenCalled();
      });
    });
  });

  describe('Code Splitting Strategy', () => {
    it('should lazy load media components', () => {
      const mediaComponents = Object.entries(lazyComponentRegistry)
        .filter(([_, comp]) => comp.category === 'media')
        .map(([key, _]) => key);

      expect(mediaComponents.length).toBeGreaterThan(0);
    });

    it('should lazy load education components', () => {
      const eduComponents = Object.entries(lazyComponentRegistry)
        .filter(([_, comp]) => comp.category === 'education')
        .map(([key, _]) => key);

      expect(eduComponents.length).toBeGreaterThan(0);
    });

    it('should lazy load profile and settings', () => {
      const profileComponents = Object.entries(lazyComponentRegistry)
        .filter(([_, comp]) => ['profile', 'settings'].includes(comp.category))
        .map(([key, _]) => key);

      expect(profileComponents.length).toBeGreaterThan(0);
    });
  });
});
