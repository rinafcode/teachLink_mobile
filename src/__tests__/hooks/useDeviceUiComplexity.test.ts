import { act, renderHook } from '@testing-library/react-native';
import * as Battery from 'expo-battery';

import { useDeviceUiComplexity } from '../../hooks/useDeviceUiComplexity';
import { mobileAnalyticsService } from '../../services/mobileAnalytics';
import { AnalyticsEvent } from '../../utils/trackingEvents';

jest.mock('../../services/mobileAnalytics', () => ({
  mobileAnalyticsService: { trackEvent: jest.fn() },
}));

const mockTrackEvent = mobileAnalyticsService.trackEvent as jest.Mock;
const mockUseLowPowerMode = Battery.useLowPowerMode as jest.Mock;
const GB = 1024 * 1024 * 1024;

function mockDevice() {
  return jest.requireMock('expo-device') as {
    deviceYearClass: number | null;
    totalMemory: number | null;
    [key: string]: unknown;
  };
}

describe('useDeviceUiComplexity', () => {
  beforeEach(() => {
    mockDevice().deviceYearClass = 2021;
    mockDevice().totalMemory = 4 * GB;
    mockUseLowPowerMode.mockReturnValue(false);
    mockTrackEvent.mockClear();
  });

  it('classifies high when battery saver is off and RAM >= 4GB', () => {
    const { result } = renderHook(() => useDeviceUiComplexity());
    expect(result.current.complexityLevel).toBe('high');
    expect(result.current.shouldReduceAnimations).toBe(false);
    expect(result.current.shouldDisableHeavyEffects).toBe(false);
    expect(result.current.animationTargetFPS).toBe(60);
    expect(result.current.animationDurationMultiplier).toBe(1);
  });

  it('classifies low when battery saver is enabled', () => {
    mockUseLowPowerMode.mockReturnValue(true);
    const { result } = renderHook(() => useDeviceUiComplexity());
    expect(result.current.complexityLevel).toBe('low');
    expect(result.current.shouldReduceAnimations).toBe(true);
    expect(result.current.shouldDisableHeavyEffects).toBe(true);
    expect(result.current.animationTargetFPS).toBe(30);
    expect(result.current.animationDurationMultiplier).toBe(2);
  });

  it('classifies low when deviceYearClass is before 2018', () => {
    mockDevice().deviceYearClass = 2016;
    const { result } = renderHook(() => useDeviceUiComplexity());
    expect(result.current.complexityLevel).toBe('low');
    expect(result.current.isLowEndDevice).toBe(true);
    expect(result.current.animationTargetFPS).toBe(30);
  });

  it('classifies low when RAM is under 2GB', () => {
    mockDevice().totalMemory = 1 * GB;
    const { result } = renderHook(() => useDeviceUiComplexity());
    expect(result.current.complexityLevel).toBe('low');
    expect(result.current.animationTargetFPS).toBe(30);
  });

  it('classifies mid when RAM is between 2GB and 4GB', () => {
    mockDevice().totalMemory = 3 * GB;
    const { result } = renderHook(() => useDeviceUiComplexity());
    expect(result.current.complexityLevel).toBe('mid');
    expect(result.current.shouldReduceAnimations).toBe(true);
    expect(result.current.shouldDisableHeavyEffects).toBe(true);
    expect(result.current.animationTargetFPS).toBe(45);
    expect(result.current.animationDurationMultiplier).toBe(1.5);
  });

  it('classifies high at RAM exactly 4GB (boundary)', () => {
    mockDevice().totalMemory = 4 * GB;
    const { result } = renderHook(() => useDeviceUiComplexity());
    expect(result.current.complexityLevel).toBe('high');
  });

  it('computes frameIntervalMs correctly for each level', () => {
    const { result: high } = renderHook(() => useDeviceUiComplexity());
    expect(high.current.frameIntervalMs).toBeCloseTo(1000 / 60, 2);

    mockDevice().totalMemory = 3 * GB;
    const { result: mid } = renderHook(() => useDeviceUiComplexity());
    expect(mid.current.frameIntervalMs).toBeCloseTo(1000 / 45, 2);

    mockDevice().deviceYearClass = 2015;
    const { result: low } = renderHook(() => useDeviceUiComplexity());
    expect(low.current.frameIntervalMs).toBeCloseTo(1000 / 30, 2);
  });

  describe('analytics monitoring', () => {
    it('fires DEVICE_COMPLEXITY_ASSIGNED on mount with correct properties', () => {
      const { result } = renderHook(() => useDeviceUiComplexity());
      act(() => {});
      expect(mockTrackEvent).toHaveBeenCalledWith(
        AnalyticsEvent.DEVICE_COMPLEXITY_ASSIGNED,
        expect.objectContaining({
          complexity_level: result.current.complexityLevel,
          is_low_end_device: result.current.isLowEndDevice,
          is_battery_saver: result.current.isBatterySaverEnabled,
          animation_target_fps: result.current.animationTargetFPS,
        })
      );
    });

    it('fires with complexity_level "low" for a low-end device', () => {
      mockDevice().deviceYearClass = 2015;
      renderHook(() => useDeviceUiComplexity());
      act(() => {});
      expect(mockTrackEvent).toHaveBeenCalledWith(
        AnalyticsEvent.DEVICE_COMPLEXITY_ASSIGNED,
        expect.objectContaining({ complexity_level: 'low' })
      );
    });

    it('fires with complexity_level "mid" for a mid-range device', () => {
      mockDevice().totalMemory = 3 * GB;
      renderHook(() => useDeviceUiComplexity());
      act(() => {});
      expect(mockTrackEvent).toHaveBeenCalledWith(
        AnalyticsEvent.DEVICE_COMPLEXITY_ASSIGNED,
        expect.objectContaining({ complexity_level: 'mid' })
      );
    });
  });

  describe('shouldDisableHeavyEffects', () => {
    it('is false on high-end device', () => {
      const { result } = renderHook(() => useDeviceUiComplexity());
      expect(result.current.shouldDisableHeavyEffects).toBe(false);
    });

    it('is true on low-end device (year class)', () => {
      mockDevice().deviceYearClass = 2015;
      const { result } = renderHook(() => useDeviceUiComplexity());
      expect(result.current.shouldDisableHeavyEffects).toBe(true);
    });

    it('is true on mid-range device', () => {
      mockDevice().totalMemory = 3 * GB;
      const { result } = renderHook(() => useDeviceUiComplexity());
      expect(result.current.shouldDisableHeavyEffects).toBe(true);
    });

    it('is true when battery saver is enabled on high-end device', () => {
      mockUseLowPowerMode.mockReturnValue(true);
      const { result } = renderHook(() => useDeviceUiComplexity());
      expect(result.current.shouldDisableHeavyEffects).toBe(true);
    });
  });
});
