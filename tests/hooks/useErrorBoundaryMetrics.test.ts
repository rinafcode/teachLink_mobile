import { act, renderHook } from '@testing-library/react-native';

import { useErrorBoundaryMetrics } from '../../hooks/useErrorBoundaryMetrics';

describe('useErrorBoundaryMetrics', () => {
  it('starts with all counts at zero and a success rate of 0', () => {
    const { result } = renderHook(() => useErrorBoundaryMetrics());

    expect(result.current.metrics).toEqual({
      totalErrors: 0,
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      successRate: 0,
    });
  });

  it('recordError increments totalErrors only', () => {
    const { result } = renderHook(() => useErrorBoundaryMetrics());

    act(() => result.current.recordError());
    act(() => result.current.recordError());

    expect(result.current.metrics.totalErrors).toBe(2);
    expect(result.current.metrics.totalRetries).toBe(0);
  });

  it('recordRetrySuccess increments successfulRetries and totalRetries and updates successRate', () => {
    const { result } = renderHook(() => useErrorBoundaryMetrics());

    act(() => result.current.recordRetrySuccess());

    expect(result.current.metrics.successfulRetries).toBe(1);
    expect(result.current.metrics.totalRetries).toBe(1);
    expect(result.current.metrics.successRate).toBe(1);
  });

  it('recordRetryFailure increments failedRetries and totalRetries', () => {
    const { result } = renderHook(() => useErrorBoundaryMetrics());

    act(() => result.current.recordRetryFailure());

    expect(result.current.metrics.failedRetries).toBe(1);
    expect(result.current.metrics.totalRetries).toBe(1);
    expect(result.current.metrics.successRate).toBe(0);
  });

  it('resetMetrics returns all counts to zero', () => {
    const { result } = renderHook(() => useErrorBoundaryMetrics());

    act(() => {
      result.current.recordError();
      result.current.recordRetrySuccess();
      result.current.recordRetryFailure();
    });
    act(() => result.current.resetMetrics());

    expect(result.current.metrics).toEqual({
      totalErrors: 0,
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      successRate: 0,
    });
  });

  it('computes successRate as successfulRetries / totalRetries (2 of 4 = 0.5)', () => {
    const { result } = renderHook(() => useErrorBoundaryMetrics());

    act(() => {
      result.current.recordRetrySuccess();
      result.current.recordRetrySuccess();
      result.current.recordRetryFailure();
      result.current.recordRetryFailure();
    });

    expect(result.current.metrics.totalRetries).toBe(4);
    expect(result.current.metrics.successfulRetries).toBe(2);
    expect(result.current.metrics.successRate).toBe(0.5);
  });
});
