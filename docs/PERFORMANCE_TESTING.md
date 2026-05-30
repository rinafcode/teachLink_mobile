# Performance Testing Guide

## Overview

This document describes the performance regression testing framework for teachLink Mobile. Performance tests ensure that heavy components maintain acceptable render times and memory usage across changes.

## Performance Budgets

Each heavy component has defined performance budgets:

### MobileSearch
- **Max Render Time**: 500ms
- **Max Memory Increase**: 10MB
- **Regression Threshold**: 10%

### VirtualList
- **Max Render Time**: 300ms
- **Max Memory Increase**: 5MB
- **Regression Threshold**: 10%

### AdvancedDataGrid
- **Max Render Time**: 600ms
- **Max Memory Increase**: 15MB
- **Regression Threshold**: 10%

## Running Performance Tests

### Run all performance tests
```bash
npm test -- --testPathPattern=perf
```

### Run performance tests for a specific component
```bash
npm test -- MobileSearch.perf.test.tsx
npm test -- VirtualList.perf.test.tsx
npm test -- AdvancedDataGrid.perf.test.tsx
```

### Run with coverage
```bash
npm run test:coverage -- --testPathPattern=perf
```

## Performance Metrics

Each test measures:

1. **Render Time**: Time taken to render the component (milliseconds)
2. **Memory Usage**: Memory allocated during render (bytes)
3. **Regression Detection**: Comparison against baseline metrics

## Test Scenarios

### MobileSearch
- Basic render within budget
- Regression detection (10% threshold)
- Rapid prop changes
- Large search result sets

### VirtualList
- Rendering 100 items
- Rendering 500 items
- Rendering 1000 items
- Fixed item height optimization

### AdvancedDataGrid
- Rendering 50 rows
- Rendering 200 rows
- Rendering 500 rows
- Sorting performance
- Filtering performance
- Pagination performance

## CI/CD Integration

Performance tests run automatically on:
- Pull requests to `main`
- Pushes to `main`
- Manual trigger via GitHub Actions

Tests fail if:
- Any component exceeds its performance budget
- Regression exceeds 10% threshold
- Memory usage exceeds limits

## Adding New Performance Tests

### 1. Create a new test file
```typescript
// tests/components/MyComponent.perf.test.tsx
import { render } from '@testing-library/react-native';
import { measureAveragePerformance, checkPerformanceBudget } from '../../src/utils/performanceUtils';

describe('MyComponent Performance Tests', () => {
  const performanceBudget = {
    maxRenderTime: 300,
    maxMemoryIncrease: 5 * 1024 * 1024,
    regressionThreshold: 10,
  };

  it('should render within performance budget', () => {
    const metrics = measureAveragePerformance(() => {
      render(<MyComponent />);
    }, 3);

    const result = checkPerformanceBudget(metrics, performanceBudget);
    expect(result.passed).toBe(true);
  });
});
```

### 2. Define performance budgets
- Set realistic budgets based on component complexity
- Consider device capabilities (mobile devices)
- Leave headroom for future features

### 3. Test with various prop counts
- Test with minimum data
- Test with typical data
- Test with maximum expected data

## Performance Utilities

### `measureRenderTime(fn: () => void): number`
Measures the time taken to execute a function.

### `getMemoryUsage(): number`
Gets current heap memory usage.

### `measurePerformance(fn: () => void): PerformanceMetrics`
Measures both render time and memory usage.

### `checkPerformanceBudget(metrics, budget): { passed, violations }`
Checks if metrics exceed budget limits.

### `detectRegression(current, baseline, threshold): { isRegression, percentChange, message }`
Detects performance regressions compared to baseline.

### `measureAveragePerformance(fn, iterations): PerformanceMetrics`
Runs a function multiple times and returns average metrics.

## Best Practices

1. **Run tests multiple times**: Use `measureAveragePerformance` with 3+ iterations
2. **Test realistic scenarios**: Use actual data sizes and prop combinations
3. **Monitor memory**: Track memory usage to catch leaks early
4. **Set conservative budgets**: Leave headroom for future features
5. **Document changes**: Update budgets when intentional changes are made
6. **Review regressions**: Investigate any regression > 10%

## Troubleshooting

### Tests are flaky
- Increase iterations in `measureAveragePerformance`
- Check for background processes affecting performance
- Run tests in isolation: `npm test -- --runInBand`

### Memory usage is high
- Check for memory leaks in component
- Verify mocks are properly cleaning up
- Use `useMemoryMonitor` hook for debugging

### Regression detected
- Profile the component with React DevTools
- Check for unnecessary re-renders
- Review recent changes to the component
- Consider if budget needs adjustment

## Related Issues

- #31: Performance optimization
- #34: Memory management
- #78: Render performance

## Team Training

All team members should:
1. Understand performance budgets for their components
2. Run performance tests before submitting PRs
3. Investigate regressions > 10%
4. Update budgets when making intentional changes
5. Document performance-related changes in PR descriptions
