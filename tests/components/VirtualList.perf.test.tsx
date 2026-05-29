import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { VirtualList } from '../../src/components/mobile/VirtualList';
import {
  checkPerformanceBudget,
  detectRegression,
  measureAveragePerformance,
  PerformanceBudget,
} from '../../src/utils/performanceUtils';

jest.mock('../../src/hooks', () => ({
  useMemoryMonitor: jest.fn(),
}));

describe('VirtualList Performance Tests', () => {
  const performanceBudget: PerformanceBudget = {
    maxRenderTime: 300, // 300ms max render time
    maxMemoryIncrease: 5 * 1024 * 1024, // 5MB max memory increase
    regressionThreshold: 10, // 10% regression threshold
  };

  const baselineMetrics = {
    renderTime: 80,
    memoryUsed: 1 * 1024 * 1024,
    timestamp: Date.now(),
  };

  const generateTestData = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: i, title: `Item ${i}` }));

  it('should render 100 items within performance budget', () => {
    const data = generateTestData(100);

    const metrics = measureAveragePerformance(() => {
      render(
        <VirtualList
          data={data}
          renderItem={({ item }) => <Text>{item.title}</Text>}
          keyExtractor={item => item.id.toString()}
          itemHeight={50}
        />
      );
    }, 3);

    const result = checkPerformanceBudget(metrics, performanceBudget);
    expect(result.passed).toBe(true);
    if (!result.passed) {
      console.log('Performance violations:', result.violations);
    }
  });

  it('should not regress more than 10% from baseline', () => {
    const data = generateTestData(100);

    const metrics = measureAveragePerformance(() => {
      render(
        <VirtualList
          data={data}
          renderItem={({ item }) => <Text>{item.title}</Text>}
          keyExtractor={item => item.id.toString()}
          itemHeight={50}
        />
      );
    }, 3);

    const regression = detectRegression(
      metrics,
      baselineMetrics,
      performanceBudget.regressionThreshold
    );
    expect(regression.isRegression).toBe(false);
    console.log(`Render time: ${metrics.renderTime.toFixed(2)}ms (${regression.message})`);
  });

  it('should handle 500 items efficiently', () => {
    const data = generateTestData(500);

    const metrics = measureAveragePerformance(() => {
      render(
        <VirtualList
          data={data}
          renderItem={({ item }) => <Text>{item.title}</Text>}
          keyExtractor={item => item.id.toString()}
          itemHeight={50}
        />
      );
    }, 2);

    expect(metrics.renderTime).toBeLessThan(performanceBudget.maxRenderTime * 1.5);
  });

  it('should handle 1000 items without excessive memory usage', () => {
    const data = generateTestData(1000);

    const metrics = measureAveragePerformance(() => {
      render(
        <VirtualList
          data={data}
          renderItem={({ item }) => <Text>{item.title}</Text>}
          keyExtractor={item => item.id.toString()}
          itemHeight={50}
        />
      );
    }, 1);

    expect(metrics.memoryUsed).toBeLessThan(performanceBudget.maxMemoryIncrease * 2);
  });

  it('should maintain performance with fixed item heights', () => {
    const data = generateTestData(200);

    const metrics = measureAveragePerformance(() => {
      render(
        <VirtualList
          data={data}
          renderItem={({ item }) => <Text>{item.title}</Text>}
          keyExtractor={item => item.id.toString()}
          itemHeight={50}
        />
      );
    }, 3);

    expect(metrics.renderTime).toBeLessThan(performanceBudget.maxRenderTime);
  });
});
