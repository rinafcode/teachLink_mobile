import { renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useAppLifecycle } from '../../src/hooks/useAppLifecycle';

// ── Service mocks ─────────────────────────────────────────────────────────────
jest.mock('../../src/services/syncService', () => ({
  __esModule: true,
  default: {
    startAutoSync: jest.fn(),
    stopAutoSync: jest.fn(),
  },
}));

jest.mock('../../src/services/api/requestQueue', () => ({
  __esModule: true,
  requestQueue: {
    stopMonitoring: jest.fn(),
    resumeMonitoring: jest.fn(),
  },
}));

jest.mock('../../src/services/socket', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  appLogger: { infoSync: jest.fn(), errorSync: jest.fn() },
}));

// ── Imports after mocks ───────────────────────────────────────────────────────
import syncService from '../../src/services/syncService';
import { requestQueue } from '../../src/services/api/requestQueue';
import socketService from '../../src/services/socket';

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Returns the AppState change handler registered by the hook.
 * Relies on jest.setup.js mocking AppState.addEventListener.
 */
function getAppStateHandler(): (state: string) => void {
  const calls = (AppState.addEventListener as jest.Mock).mock.calls;
  const lastCall = calls[calls.length - 1];
  return lastCall[1];
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('useAppLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset currentState so all tests start from 'active'
    (AppState as any).currentState = 'active';
  });

  it('registers an AppState listener on mount', () => {
    renderHook(() => useAppLifecycle());
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('removes the AppState listener on unmount', () => {
    const mockRemove = jest.fn();
    (AppState.addEventListener as jest.Mock).mockReturnValueOnce({ remove: mockRemove });

    const { unmount } = renderHook(() => useAppLifecycle());
    unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  describe('active → background', () => {
    it('stops the sync interval', () => {
      renderHook(() => useAppLifecycle());
      getAppStateHandler()('background');
      expect(syncService.stopAutoSync).toHaveBeenCalledTimes(1);
    });

    it('stops request-queue monitoring', () => {
      renderHook(() => useAppLifecycle());
      getAppStateHandler()('background');
      expect(requestQueue.stopMonitoring).toHaveBeenCalledTimes(1);
    });

    it('disconnects the socket', () => {
      renderHook(() => useAppLifecycle());
      getAppStateHandler()('background');
      expect(socketService.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('active → inactive', () => {
    it('also pauses timers for inactive state', () => {
      renderHook(() => useAppLifecycle());
      getAppStateHandler()('inactive');
      expect(syncService.stopAutoSync).toHaveBeenCalledTimes(1);
      expect(requestQueue.stopMonitoring).toHaveBeenCalledTimes(1);
      expect(socketService.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('background → active', () => {
    it('restarts the sync interval', () => {
      renderHook(() => useAppLifecycle());
      const handler = getAppStateHandler();

      handler('background'); // go to background first
      jest.clearAllMocks();
      (AppState as any).currentState = 'background';

      handler('active');    // return to foreground
      expect(syncService.startAutoSync).toHaveBeenCalledTimes(1);
    });

    it('resumes request-queue monitoring', () => {
      renderHook(() => useAppLifecycle());
      const handler = getAppStateHandler();

      handler('background');
      jest.clearAllMocks();
      (AppState as any).currentState = 'background';

      handler('active');
      expect(requestQueue.resumeMonitoring).toHaveBeenCalledTimes(1);
    });

    it('reconnects the socket', () => {
      renderHook(() => useAppLifecycle());
      const handler = getAppStateHandler();

      handler('background');
      jest.clearAllMocks();
      (AppState as any).currentState = 'background';

      handler('active');
      expect(socketService.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('active → active (no-op)', () => {
    it('does not trigger pause or resume when already active', () => {
      renderHook(() => useAppLifecycle());
      getAppStateHandler()('active'); // still active — should be no-op
      expect(syncService.stopAutoSync).not.toHaveBeenCalled();
      expect(syncService.startAutoSync).not.toHaveBeenCalled();
    });
  });
});
