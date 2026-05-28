import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import {
  advanceDebounce,
  CONSECUTIVE_READINGS_REQUIRED,
  getCandidateThemeFromLux,
  useAdaptiveTheme,
} from '../../src/hooks/useAdaptiveTheme';
import { useAppStore } from '../../src/store';
import { useSettingsStore } from '../../src/store/settingsStore';

const mockRemove = jest.fn();
const mockAddListener = jest.fn();
const mockIsAvailableAsync = jest.fn<() => Promise<boolean>>();
const mockSetUpdateInterval = jest.fn();

jest.mock('expo-sensors', () => ({
  LightSensor: {
    isAvailableAsync: () => mockIsAvailableAsync(),
    setUpdateInterval: (ms: number) => mockSetUpdateInterval(ms),
    addListener: (listener: (data: { illuminance: number }) => void) => {
      mockAddListener(listener);
      return { remove: mockRemove };
    },
  },
}));

type AppStateChangeHandler = (state: string) => void;
let appStateHandler: AppStateChangeHandler | null = null;

jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
  appStateHandler = handler as AppStateChangeHandler;
  return { remove: jest.fn() };
});

beforeEach(() => {
  mockRemove.mockClear();
  mockAddListener.mockClear();
  mockSetUpdateInterval.mockClear();
  mockIsAvailableAsync.mockResolvedValue(true);
  appStateHandler = null;

  useSettingsStore.setState({ adaptiveThemeEnabled: false });
  useAppStore.setState({ theme: 'light' });
});

describe('getCandidateThemeFromLux', () => {
  it('returns dark below dark threshold', () => {
    expect(getCandidateThemeFromLux(10)).toBe('dark');
    expect(getCandidateThemeFromLux(24)).toBe('dark');
  });

  it('returns light above light threshold', () => {
    expect(getCandidateThemeFromLux(76)).toBe('light');
    expect(getCandidateThemeFromLux(200)).toBe('light');
  });

  it('returns null in hysteresis band', () => {
    expect(getCandidateThemeFromLux(25)).toBeNull();
    expect(getCandidateThemeFromLux(50)).toBeNull();
    expect(getCandidateThemeFromLux(75)).toBeNull();
  });
});

describe('advanceDebounce', () => {
  const initial = { candidate: null as const, consecutiveCount: 0 };

  it('requires consecutive stable readings before confirming', () => {
    let state = initial;
    let result = advanceDebounce(state, 10, 'light');
    expect(result.confirmedTheme).toBeNull();
    expect(result.state.consecutiveCount).toBe(1);

    state = result.state;
    result = advanceDebounce(state, 10, 'light');
    expect(result.confirmedTheme).toBeNull();
    expect(result.state.consecutiveCount).toBe(2);

    state = result.state;
    result = advanceDebounce(state, 10, 'light');
    expect(result.confirmedTheme).toBe('dark');
    expect(result.state.consecutiveCount).toBe(0);
  });

  it('resets debounce when a reading matches the current theme', () => {
    const building = advanceDebounce(initial, 10, 'light');
    expect(building.state.candidate).toBe('dark');

    const cleared = advanceDebounce(building.state, 100, 'light');
    expect(cleared.state.candidate).toBeNull();
    expect(cleared.state.consecutiveCount).toBe(0);
    expect(cleared.confirmedTheme).toBeNull();
  });

  it('clears candidate in hysteresis band', () => {
    const built = advanceDebounce(initial, 10, 'light');
    const inBand = advanceDebounce(built.state, 50, 'light');
    expect(inBand.state.candidate).toBeNull();
    expect(inBand.state.consecutiveCount).toBe(0);
  });

  it('uses CONSECUTIVE_READINGS_REQUIRED for confirmation', () => {
    expect(CONSECUTIVE_READINGS_REQUIRED).toBe(3);
  });
});

describe('useAdaptiveTheme', () => {
  it('does not subscribe when adaptive theme is disabled', async () => {
    useSettingsStore.setState({ adaptiveThemeEnabled: false });

    renderHook(() => useAdaptiveTheme());
    await act(async () => {});

    expect(mockIsAvailableAsync).not.toHaveBeenCalled();
    expect(mockAddListener).not.toHaveBeenCalled();
  });

  it('subscribes when enabled and sensor is available', async () => {
    useSettingsStore.setState({ adaptiveThemeEnabled: true });

    renderHook(() => useAdaptiveTheme());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockIsAvailableAsync).toHaveBeenCalled();
    expect(mockSetUpdateInterval).toHaveBeenCalledWith(1000);
    expect(mockAddListener).toHaveBeenCalled();
  });

  it('does not change theme on a single reading (debounce)', async () => {
    useSettingsStore.setState({ adaptiveThemeEnabled: true });
    useAppStore.setState({ theme: 'light' });

    renderHook(() => useAdaptiveTheme());
    await act(async () => {
      await Promise.resolve();
    });

    const listener = mockAddListener.mock.calls[0][0] as (data: {
      illuminance: number;
    }) => void;

    act(() => listener({ illuminance: 10 }));
    expect(useAppStore.getState().theme).toBe('light');
  });

  it('applies theme after debounced consecutive dark readings', async () => {
    useSettingsStore.setState({ adaptiveThemeEnabled: true });
    useAppStore.setState({ theme: 'light' });

    renderHook(() => useAdaptiveTheme());
    await act(async () => {
      await Promise.resolve();
    });

    const listener = mockAddListener.mock.calls[0][0] as (data: {
      illuminance: number;
    }) => void;

    act(() => listener({ illuminance: 10 }));
    act(() => listener({ illuminance: 10 }));
    act(() => listener({ illuminance: 10 }));

    expect(useAppStore.getState().theme).toBe('dark');
  });

  it('removes subscription on unmount', async () => {
    useSettingsStore.setState({ adaptiveThemeEnabled: true });

    const { unmount } = renderHook(() => useAdaptiveTheme());
    await act(async () => {
      await Promise.resolve();
    });

    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('unsubscribes when app goes to background', async () => {
    useSettingsStore.setState({ adaptiveThemeEnabled: true });

    renderHook(() => useAdaptiveTheme());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => appStateHandler?.('background'));
    expect(mockRemove).toHaveBeenCalled();
  });
});
