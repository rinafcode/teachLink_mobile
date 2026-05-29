import { render } from '@testing-library/react-native';
import React from 'react';

import { AdvancedDataGrid } from '../../src/components/grid/AdvancedDataGrid';
import { ColumnDef, GridRow } from '../../src/utils/gridUtils';
import {
  checkPerformanceBudget,
  detectRegression,
  measureAveragePerformance,
  PerformanceBudget,
} from '../../src/utils/performanceUtils';

// Mock dependencies
jest.mock('lucide-react-native', () => ({
  ArrowDown: () => null,
  ArrowUp: () => null,
  ArrowUpDown: () => null,
  Download: () => null,
  Filter: () => null,
  FilterX: () => null,
  Search: () => null,
  X: () => null,
  Check: () => null,
  AlertCircle: () => null,
}));

jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
}));

jest.mock('../../src/services/crashReporting', () => ({
  crashReportingService: { reportError: jest.fn() },
}));

describe('AdvancedDataGrid Performance Tests', () => {
  interface TestRow extends GridRow {
    id: number;
    name: string;
    email: string;
    score: number;
    status: string;
  }

  const performanceBudget: PerformanceBudget = {
    maxRenderTime: 600, // 600ms max render time
    maxMemoryIncrease: 15 * 1024 * 1024, // 15MB max memory increase
    regressionThreshold: 10, // 10% regression threshold
  };

  const baselineMetrics = {
    renderTime: 200,
    memoryUsed: 3 * 1024 * 1024,
    timestamp: Date.now(),
  };

  const columns: ColumnDef<TestRow>[] = [
    { key: 'id', title: 'ID', type: 'number', sortable: true },
    { key: 'name', title: 'Name', type: 'string', sortable: true, filterable: true },
    { key: 'email', title: 'Email', type: 'string', sortable: true, filterable: true },
    { key: 'score', title: 'Score', type: 'number', sortable: true, filterable: true },
    { key: 'status', title: 'Status', type: 'string', sortable: true, filterable: true },
  ];

  const generateTestData = (count: number): TestRow[] =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      score: Math.floor(Math.random() * 100),
      status: ['active', 'inactive', 'pending'][Math.floor(Math.random() * 3)],
    }));

  it('should render 50 rows within performance budget', () => {
    const rows = generateTestData(50);

    const metrics = measureAveragePerformance(() => {
      render(<AdvancedDataGrid columns={columns} rows={rows} />);
    }, 3);

    const result = checkPerformanceBudget(metrics, performanceBudget);
    expect(result.passed).toBe(true);
    if (!result.passed) {
      console.log('Performance violations:', result.violations);
    }
  });

  it('should not regress more than 10% from baseline', () => {
    const rows = generateTestData(50);

    const metrics = measureAveragePerformance(() => {
      render(<AdvancedDataGrid columns={columns} rows={rows} />);
    }, 3);

    const regression = detectRegression(metrics, baselineMetrics, performanceBudget.regressionThreshold);
    expect(regression.isRegression).toBe(false);
    console.log(`Render time: ${metrics.renderTime.toFixed(2)}ms (${regression.message})`);
  });

  it('should handle 200 rows efficiently', () => {
    const rows = generateTestData(200);

    const metrics = measureAveragePerformance(() => {
      render(<AdvancedDataGrid columns={columns} rows={rows} />);
    }, 2);

    expect(metrics.renderTime).toBeLessThan(performanceBudget.maxRenderTime);
  });

  it('should handle 500 rows without excessive memory usage', () => {
    const rows = generateTestData(500);

    const metrics = measureAveragePerformance(() => {
      render(<AdvancedDataGrid columns={columns} rows={rows} />);
    }, 1);

    expect(metrics.memoryUsed).toBeLessThan(performanceBudget.maxMemoryIncrease * 1.5);
  });

  it('should maintain performance with sorting enabled', () => {
    const rows = generateTestData(100);

    const metrics = measureAveragePerformance(() => {
      render(
        <AdvancedDataGrid
          columns={columns}
          rows={rows}
          defaultSortKey="name"
          defaultSortDirection="asc"
        />
      );
    }, 2);

    expect(metrics.renderTime).toBeLessThan(performanceBudget.maxRenderTime);
  });

  it('should maintain performance with filtering enabled', () => {
    const rows = generateTestData(100);

    const metrics = measureAveragePerformance(() => {
      render(<AdvancedDataGrid columns={columns} rows={rows} showFilters={true} />);
    }, 2);

    expect(metrics.renderTime).toBeLessThan(performanceBudget.maxRenderTime);
  });

  it('should maintain performance with pagination', () => {
    const rows = generateTestData(300);

    const metrics = measureAveragePerformance(() => {
      render(<AdvancedDataGrid columns={columns} rows={rows} defaultPageSize={15} />);
    }, 2);

    expect(metrics.renderTime).toBeLessThan(performanceBudget.maxRenderTime);
  });
});
