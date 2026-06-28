import { act, renderHook } from '@testing-library/react-native';

import { useRequireReauth } from '../../hooks/useRequireReauth';
import { useDeviceStore } from '../../store/deviceStore';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';

jest.mock('../../hooks/useBiometricAuth', () => ({
  useBiometricAuth: jest.fn(),
}));

const mockUseBiometricAuth = useBiometricAuth as jest.Mock;

describe('useRequireReauth', () => {
  const mockAuthenticate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useDeviceStore.setState({
      lastBiometricAuth: null,
    });
    mockUseBiometricAuth.mockReturnValue({
      authenticate: mockAuthenticate,
      isAvailable: true,
      isEnabled: true,
    });
  });

  it('triggers biometric challenge if lastBiometricAuth is null', async () => {
    mockAuthenticate.mockResolvedValue({ user: {}, tokens: {} });

    const { result } = renderHook(() => useRequireReauth());
    let allowed: boolean | null = null;

    await act(async () => {
      allowed = await result.current.performReauthCheck();
    });

    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    expect(allowed).toBe(true);
    expect(useDeviceStore.getState().lastBiometricAuth).not.toBeNull();
  });

  it('skips biometric challenge if within 5-minute threshold', async () => {
    const recentTime = Date.now() - 120000; // 2 minutes ago
    useDeviceStore.setState({
      lastBiometricAuth: recentTime,
    });

    const { result } = renderHook(() => useRequireReauth(300000));
    let allowed: boolean | null = null;

    await act(async () => {
      allowed = await result.current.performReauthCheck();
    });

    expect(mockAuthenticate).not.toHaveBeenCalled();
    expect(allowed).toBe(true);
    expect(useDeviceStore.getState().lastBiometricAuth).toBe(recentTime);
  });

  it('triggers biometric challenge if past 5-minute threshold', async () => {
    const oldTime = Date.now() - 360000; // 6 minutes ago
    useDeviceStore.setState({
      lastBiometricAuth: oldTime,
    });
    mockAuthenticate.mockResolvedValue({ user: {}, tokens: {} });

    const { result } = renderHook(() => useRequireReauth(300000));
    let allowed: boolean | null = null;

    await act(async () => {
      allowed = await result.current.performReauthCheck();
    });

    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    expect(allowed).toBe(true);
    expect(useDeviceStore.getState().lastBiometricAuth).toBeGreaterThan(oldTime);
  });

  it('blocks operation (returns false) if biometric challenge is cancelled/fails', async () => {
    const oldTime = Date.now() - 360000; // 6 minutes ago
    useDeviceStore.setState({
      lastBiometricAuth: oldTime,
    });
    mockAuthenticate.mockResolvedValue(null); // biometric cancelled

    const { result } = renderHook(() => useRequireReauth(300000));
    let allowed: boolean | null = null;

    await act(async () => {
      allowed = await result.current.performReauthCheck();
    });

    expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    expect(allowed).toBe(false);
    expect(useDeviceStore.getState().lastBiometricAuth).toBe(oldTime); // timestamp not updated
  });

  it('enforces minimum 1-minute threshold', async () => {
    // 50 seconds ago, past the requested 30s threshold but within the enforced 60s minimum
    const time = Date.now() - 50000;
    useDeviceStore.setState({
      lastBiometricAuth: time,
    });

    const { result } = renderHook(() => useRequireReauth(30000)); // request 30s threshold
    let allowed: boolean | null = null;

    await act(async () => {
      allowed = await result.current.performReauthCheck();
    });

    expect(mockAuthenticate).not.toHaveBeenCalled();
    expect(allowed).toBe(true);
  });
});
