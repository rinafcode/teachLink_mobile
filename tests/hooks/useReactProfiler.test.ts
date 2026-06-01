import { renderHook, act } from '@testing-library/react-native';
import { useReactProfiler } from '../../src/hooks/useReactProfiler';
import { mobileAnalyticsService } from '../../src/services/mobileAnalytics';
import { appLogger } from '../../src/utils/logger';
import { PerformanceMetric } from '../../src/utils/trackingEvents';

jest.mock('../../src/services/mobileAnalytics', () => ({
  mobileAnalyticsService: {
    trackEvent: jest.fn(),
    trackPerformance: jest.fn(),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  appLogger: {
    infoSync: jest.fn(),
    warnSync: jest.fn(),
  },
}));

const mockTrackEvent = mobileAnalyticsService.trackEvent as jest.MockedFunction<
  typeof mobileAnalyticsService.trackEvent
>;
const mockTrackPerformance = mobileAnalyticsService.trackPerformance as jest.MockedFunction<
  typeof mobileAnalyticsService.trackPerformance
>;
const mockInfoSync = appLogger.infoSync as jest.MockedFunction<typeof appLogger.infoSync>;

function invokeOnRender(
  hook: ReturnType<typeof useReactProfiler>,
  overrides: Partial<{
    id: string;
    phase: 'mount' | 'update' | 'nested-update';
    actualDuration: number;
    baseDuration: number;
    startTime: number;
    commitTime: number;
  }> = {}
) {
  const {
    id = 'TestScreen',
    phase = 'mount',
    actualDuration = 5,
    baseDuration = 5,
    startTime = 0,
    commitTime = 10,
  } = overrides;
  act(() => {
    hook.onRender(id, phase, actualDuration, baseDuration, startTime, commitTime);
  });
}

describe('useReactProfiler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns onRender callback and initial metrics', () => {
    const { result } = renderHook(() => useReactProfiler('HomeScreen'));

    expect(typeof result.current.onRender).toBe('function');
    expect(result.current.metrics.componentName).toBe('HomeScreen');
    expect(result.current.metrics.renderCount).toBe(0);
    expect(result.current.metrics.slowRenders).toBe(0);
  });

  it('calls trackPerformance on every render', () => {
    const { result } = renderHook(() => useReactProfiler('HomeScreen'));

    invokeOnRender(result.current, { actualDuration: 8 });

    expect(mockTrackPerformance).toHaveBeenCalledWith(
      PerformanceMetric.RENDER_DURATION,
      8,
      expect.objectContaining({ component: 'HomeScreen', phase: 'mount' })
    );
  });

  it('does NOT flag a fast render as slow', () => {
    const { result } = renderHook(() =>
      useReactProfiler('HomeScreen', { slowRenderThresholdMs: 16 })
    );

    invokeOnRender(result.current, { actualDuration: 10 });

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockInfoSync).not.toHaveBeenCalled();
  });

  it('logs and tracks a slow render via trackEvent', () => {
    const { result } = renderHook(() =>
      useReactProfiler('SlowScreen', { slowRenderThresholdMs: 16 })
    );

    invokeOnRender(result.current, { actualDuration: 50, phase: 'update' });

    expect(mockInfoSync).toHaveBeenCalledWith(
      expect.stringContaining('Slow render detected — SlowScreen (update): 50.00ms')
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        component: 'SlowScreen',
        phase: 'update',
        is_slow: true,
      })
    );
  });

  it('respects a custom slowRenderThresholdMs option', () => {
    const { result } = renderHook(() =>
      useReactProfiler('FastScreen', { slowRenderThresholdMs: 100 })
    );

    invokeOnRender(result.current, { actualDuration: 50 });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('accumulates render count across multiple renders', () => {
    const { result } = renderHook(() => useReactProfiler('Counter'));

    invokeOnRender(result.current);
    invokeOnRender(result.current, { phase: 'update' });
    invokeOnRender(result.current, { phase: 'update' });

    expect(mockTrackPerformance).toHaveBeenCalledTimes(3);
  });

  it('passes event_category high_frequency to suppress sampling', () => {
    const { result } = renderHook(() => useReactProfiler('SampledScreen'));

    invokeOnRender(result.current);

    expect(mockTrackPerformance).toHaveBeenCalledWith(
      PerformanceMetric.RENDER_DURATION,
      expect.any(Number),
      expect.objectContaining({ event_category: 'high_frequency' })
    );
  });
});
