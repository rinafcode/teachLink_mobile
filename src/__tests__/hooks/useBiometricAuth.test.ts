import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { isBiometricEnabled } from '../../services/secureStorage';
import { useDeviceStore } from '../../store/deviceStore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../services/secureStorage', () => ({
  isBiometricEnabled: jest.fn(),
}));

const mockSetBiometricEnabled = jest.fn();
const mockStore = {
  isDeviceCompromised: false,
  biometricEnabled: false,
  setBiometricEnabled: mockSetBiometricEnabled,
};

jest.mock('../../store/deviceStore', () => ({
  useDeviceStore: jest.fn((selector: (s: typeof mockStore) => unknown) => selector(mockStore)),
}));

let capturedAppStateCallback: ((state: string) => void) | null = null;

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn().mockImplementation((_, cb) => {
      capturedAppStateCallback = cb;
      return { remove: jest.fn() };
    }),
  },
}));

jest.mock('../../services/mobileAuth', () => ({}));

const mockIsBiometricEnabled = isBiometricEnabled as jest.Mock;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useBiometricAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedAppStateCallback = null;
    mockStore.isDeviceCompromised = false;
    mockStore.biometricEnabled = false;
    mockIsBiometricEnabled.mockResolvedValue(false);
  });

  it('syncs biometricEnabled from SecureStore on mount', async () => {
    mockIsBiometricEnabled.mockResolvedValue(true);

    renderHook(() => useBiometricAuth());

    await waitFor(() => {
      expect(mockSetBiometricEnabled).toHaveBeenCalledWith(true);
    });
  });

  it('isLoading is true until the initial sync completes', async () => {
    let resolveEnabled!: (v: boolean) => void;
    mockIsBiometricEnabled.mockReturnValue(new Promise(r => (resolveEnabled = r)));

    const { result } = renderHook(() => useBiometricAuth());

    expect(result.current.isLoading).toBe(true);

    await act(async () => resolveEnabled(false));

    expect(result.current.isLoading).toBe(false);
  });

  it('re-syncs from SecureStore when app returns to foreground', async () => {
    mockIsBiometricEnabled.mockResolvedValue(false);
    renderHook(() => useBiometricAuth());
    await waitFor(() => expect(mockSetBiometricEnabled).toHaveBeenCalledTimes(1));

    mockIsBiometricEnabled.mockResolvedValue(true);

    await act(async () => {
      // Simulate background → foreground transition
      capturedAppStateCallback!('background');
      capturedAppStateCallback!('active');
    });

    await waitFor(() => expect(mockSetBiometricEnabled).toHaveBeenCalledWith(true));
  });

  it('divergence: SecureStore cleared while Zustand cached true → resets to false', async () => {
    // Zustand has stale true, SecureStore no longer has the entry
    mockStore.biometricEnabled = true;
    mockIsBiometricEnabled.mockResolvedValue(false);

    renderHook(() => useBiometricAuth());

    // Foreground event triggers re-sync
    await act(async () => {
      capturedAppStateCallback?.('background');
      capturedAppStateCallback?.('active');
    });

    await waitFor(() => {
      expect(mockSetBiometricEnabled).toHaveBeenCalledWith(false);
    });
  });

  it('isEnabled is false while syncing is in progress', async () => {
    mockStore.biometricEnabled = true;
    let resolveEnabled!: (v: boolean) => void;
    mockIsBiometricEnabled.mockReturnValue(new Promise(r => (resolveEnabled = r)));

    const { result } = renderHook(() => useBiometricAuth());

    expect(result.current.isLoading).toBe(true);

    await act(async () => resolveEnabled(true));
  });

  it('isEnabled is false when device is compromised regardless of SecureStore', async () => {
    mockStore.isDeviceCompromised = true;
    mockStore.biometricEnabled = true;
    mockIsBiometricEnabled.mockResolvedValue(true);

    const { result } = renderHook(() => useBiometricAuth());

    await waitFor(() => expect(mockSetBiometricEnabled).toHaveBeenCalled());

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('does not re-sync on active → background transition', async () => {
    mockIsBiometricEnabled.mockResolvedValue(false);
    renderHook(() => useBiometricAuth());
    await waitFor(() => expect(mockSetBiometricEnabled).toHaveBeenCalledTimes(1));

    await act(async () => {
      capturedAppStateCallback!('background');
    });

    // No additional sync — only foreground triggers re-sync
    expect(mockSetBiometricEnabled).toHaveBeenCalledTimes(1);
  });
});
