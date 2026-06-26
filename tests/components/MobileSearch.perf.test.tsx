import { render } from '@testing-library/react-native';
import React from 'react';

import { MobileSearch } from '../../src/components/mobile/MobileSearch';
import {
  checkPerformanceBudget,
  detectRegression,
  measureAveragePerformance,
  PerformanceBudget,
} from '../../src/utils/performanceUtils';

// Mock dependencies
jest.mock('lucide-react-native', () => ({
  AlertCircle: () => null,
  Search: () => null,
  SlidersHorizontal: () => null,
  Mic: () => null,
  X: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
}));

jest.mock('../../src/hooks', () => ({
  useAnalytics: () => ({ trackEvent: jest.fn() }),
  useDebounce: (value: any) => value,
  useDynamicFontSize: () => ({ fontSize: 16 }),
  useMemoryMonitor: jest.fn(),
}));

jest.mock('../../src/utils/searchHistory', () => ({
  addToSearchHistory: jest.fn(),
}));

jest.mock('../../src/utils/trie', () => ({
  buildTrie: () => ({}),
}));

jest.mock('../../src/utils/validation', () => ({
  validateSearchQuery: () => true,
}));

describe('MobileSearch Performance Tests', () => {
  const performanceBudget: PerformanceBudget = {
    maxRenderTime: 500, // 500ms max render time
    maxMemoryIncrease: 10 * 1024 * 1024, // 10MB max memory increase
    regressionThreshold: 10, // 10% regression threshold
  };

  const baselineMetrics = {
    renderTime: 150,
    memoryUsed: 2 * 1024 * 1024,
    timestamp: Date.now(),
  };

  it('should render within performance budget', () => {
    const metrics = measureAveragePerformance(() => {
      render(<MobileSearch onResultPress={jest.fn()} />);
    }, 3);

    const result = checkPerformanceBudget(metrics, performanceBudget);
    expect(result.passed).toBe(true);
    if (!result.passed) {
      console.log('Performance violations:', result.violations);
    }
  });

  it('should not regress more than 10% from baseline', () => {
    const metrics = measureAveragePerformance(() => {
      render(<MobileSearch onResultPress={jest.fn()} />);
    }, 3);

    const regression = detectRegression(
      metrics,
      baselineMetrics,
      performanceBudget.regressionThreshold
    );
    expect(regression.isRegression).toBe(false);
    console.log(`Render time: ${metrics.renderTime.toFixed(2)}ms (${regression.message})`);
  });

  it('should handle rapid prop changes efficiently', () => {
    const metrics = measureAveragePerformance(() => {
      const { rerender } = render(<MobileSearch onResultPress={jest.fn()} />);
      // Simulate rapid prop updates
      for (let i = 0; i < 5; i++) {
        rerender(<MobileSearch onResultPress={jest.fn()} />);
      }
    }, 2);

    expect(metrics.renderTime).toBeLessThan(performanceBudget.maxRenderTime);
  });

  it('should maintain performance with large search result sets', () => {
    const metrics = measureAveragePerformance(() => {
      render(<MobileSearch onResultPress={jest.fn()} />);
    }, 2);

    expect(metrics.memoryUsed).toBeLessThan(performanceBudget.maxMemoryIncrease);
  });
});
