import { renderHook } from '@testing-library/react-native';
import * as Battery from 'expo-battery';

import { useAdaptiveFrameRate } from '../../hooks/useAdaptiveFrameRate';

const mockUseLowPowerMode = Battery.useLowPowerMode as jest.Mock;

const GB = 1024 * 1024 * 1024;

/** Access the factory object that the hook reads from. */
function mockDevice() {
  return jest.requireMock('expo-device') as {
    deviceYearClass: number | null;
    totalMemory: number | null;
    [key: string]: unknown;
  };
}

function renderAdaptiveHook() {
  return renderHook(() => useAdaptiveFrameRate());
}

describe('useAdaptiveFrameRate', () => {
  beforeEach(() => {
    // Reset to high-end device defaults before each test.
    mockDevice().deviceYearClass = 2021;
    mockDevice().totalMemory = 4 * GB;
    mockUseLowPowerMode.mockReturnValue(false);
  });

  describe('high-end device, battery saver off', () => {
    it('returns 60 fps config', () => {
      const { result } = renderAdaptiveHook();
      expect(result.current.targetFPS).toBe(60);
      expect(result.current.durationMultiplier).toBe(1);
      expect(result.current.frameIntervalMs).toBeCloseTo(16.67, 1);
    });

    it('reports shouldReduceAnimations as false', () => {
      const { result } = renderAdaptiveHook();
      expect(result.current.shouldReduceAnimations).toBe(false);
      expect(result.current.isLowEndDevice).toBe(false);
      expect(result.current.isBatterySaverEnabled).toBe(false);
    });
  });

  describe('low-end device detection via deviceYearClass', () => {
    it('reduces to 30 fps when deviceYearClass is before 2018', () => {
      mockDevice().deviceYearClass = 2016;
      const { result } = renderAdaptiveHook();
      expect(result.current.targetFPS).toBe(30);
      expect(result.current.durationMultiplier).toBe(2);
      expect(result.current.isLowEndDevice).toBe(true);
      expect(result.current.shouldReduceAnimations).toBe(true);
    });

    it('stays at 60 fps on a 2018 device (boundary)', () => {
      mockDevice().deviceYearClass = 2018;
      const { result } = renderAdaptiveHook();
      expect(result.current.targetFPS).toBe(60);
      expect(result.current.isLowEndDevice).toBe(false);
    });

    it('stays at 60 fps when deviceYearClass is null', () => {
      mockDevice().deviceYearClass = null;
      const { result } = renderAdaptiveHook();
      expect(result.current.targetFPS).toBe(60);
    });
  });

  describe('low-end device detection via totalMemory', () => {
    it('reduces to 30 fps when RAM is under 2 GB', () => {
      mockDevice().deviceYearClass = 2021; // recent year → not low-end by year
      mockDevice().totalMemory = 1 * GB;
      const { result } = renderAdaptiveHook();
      expect(result.current.targetFPS).toBe(30);
      expect(result.current.isLowEndDevice).toBe(true);
    });

    it('reduces to 30 fps when RAM is exactly 2 GB (boundary — mid-range)', () => {
      mockDevice().deviceYearClass = 2021;
      mockDevice().totalMemory = 2 * GB;
      const { result } = renderAdaptiveHook();
      // 2 GB sits in the mid range (2 GB <= RAM < 4 GB) → shouldReduceAnimations → 30 fps
      expect(result.current.targetFPS).toBe(30);
    });

    it('stays at 60 fps when totalMemory is null', () => {
      mockDevice().deviceYearClass = 2021;
      mockDevice().totalMemory = null;
      const { result } = renderAdaptiveHook();
      expect(result.current.targetFPS).toBe(60);
    });
  });

  describe('battery saver detection', () => {
    it('reduces to 30 fps when battery saver is enabled on a high-end device', () => {
      mockUseLowPowerMode.mockReturnValue(true);
      const { result } = renderAdaptiveHook();
      expect(result.current.targetFPS).toBe(30);
      expect(result.current.durationMultiplier).toBe(2);
      expect(result.current.isBatterySaverEnabled).toBe(true);
      expect(result.current.isLowEndDevice).toBe(false);
      expect(result.current.shouldReduceAnimations).toBe(true);
    });
  });

  describe('combined conditions', () => {
    it('reduces to 30 fps when both low-end device and battery saver are active', () => {
      mockDevice().deviceYearClass = 2015;
      mockUseLowPowerMode.mockReturnValue(true);
      const { result } = renderAdaptiveHook();
      expect(result.current.targetFPS).toBe(30);
      expect(result.current.shouldReduceAnimations).toBe(true);
    });
  });

  describe('frameIntervalMs', () => {
    it('is ~16.67 ms at 60 fps', () => {
      const { result } = renderAdaptiveHook();
      expect(result.current.frameIntervalMs).toBeCloseTo(1000 / 60, 2);
    });

    it('is ~33.33 ms at 30 fps', () => {
      mockDevice().deviceYearClass = 2015;
      const { result } = renderAdaptiveHook();
      expect(result.current.frameIntervalMs).toBeCloseTo(1000 / 30, 2);
    });
  });
});
