/**
 * Tests for sessionRestorationService.
 *
 * Uses the in-memory AsyncStorage mock so that setItem/getItem
 * actually persist values across calls within each test.
 */

const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      for (const key of Object.keys(store)) delete store[key];
      return Promise.resolve();
    }),
  },
}));

// Must import after mock is registered
import AsyncStorage from '@react-native-async-storage/async-storage';

// sessionRestorationService is a singleton — reset its internal state between tests
import { sessionRestorationService } from '../../src/services/sessionRestoration';

const SESSION_ACTIVE_KEY = '@teachlink_session_active';
const SESSION_SNAPSHOT_KEY = '@teachlink_session_snapshot';

beforeEach(async () => {
  // Clear the in-memory store
  await AsyncStorage.clear();
  // Reset the singleton's internal flag
  (sessionRestorationService as any).isActive = false;
});

describe('SessionRestorationService', () => {
  describe('beginSession / endSession', () => {
    it('sets the session-active flag on beginSession', async () => {
      await sessionRestorationService.beginSession();
      const flag = await AsyncStorage.getItem(SESSION_ACTIVE_KEY);
      expect(flag).toBe('1');
    });

    it('clears the session-active flag and snapshot on endSession', async () => {
      await sessionRestorationService.beginSession();
      await sessionRestorationService.saveRoute('/quiz');
      await sessionRestorationService.endSession();

      const flag = await AsyncStorage.getItem(SESSION_ACTIVE_KEY);
      const snapshot = await AsyncStorage.getItem(SESSION_SNAPSHOT_KEY);
      expect(flag).toBeNull();
      expect(snapshot).toBeNull();
    });
  });

  describe('detectCrash', () => {
    it('returns false when no previous session was active', async () => {
      const crashed = await sessionRestorationService.detectCrash();
      expect(crashed).toBe(false);
    });

    it('returns true when the previous session-active flag was not cleared', async () => {
      // Simulate a crash: set the flag but never call endSession
      await AsyncStorage.setItem(SESSION_ACTIVE_KEY, '1');
      const crashed = await sessionRestorationService.detectCrash();
      expect(crashed).toBe(true);
    });

    it('returns false after a clean shutdown', async () => {
      await sessionRestorationService.beginSession();
      await sessionRestorationService.endSession();
      const crashed = await sessionRestorationService.detectCrash();
      expect(crashed).toBe(false);
    });
  });

  describe('saveRoute / getSnapshot', () => {
    it('saves and retrieves a route snapshot', async () => {
      await sessionRestorationService.beginSession();
      await sessionRestorationService.saveRoute('/quiz');

      const snapshot = await sessionRestorationService.getSnapshot();
      expect(snapshot).not.toBeNull();
      expect(snapshot!.route).toBe('/quiz');
      expect(snapshot!.timestamp).toBeGreaterThan(0);
    });

    it('saves route with params', async () => {
      await sessionRestorationService.beginSession();
      await sessionRestorationService.saveRoute('/course-viewer', { courseId: 'abc' });

      const snapshot = await sessionRestorationService.getSnapshot();
      expect(snapshot!.route).toBe('/course-viewer');
      expect(snapshot!.params).toEqual({ courseId: 'abc' });
    });

    it('overwrites the previous snapshot on each save', async () => {
      await sessionRestorationService.beginSession();
      await sessionRestorationService.saveRoute('/home');
      await sessionRestorationService.saveRoute('/quiz');

      const snapshot = await sessionRestorationService.getSnapshot();
      expect(snapshot!.route).toBe('/quiz');
    });

    it('returns null when no snapshot exists', async () => {
      const snapshot = await sessionRestorationService.getSnapshot();
      expect(snapshot).toBeNull();
    });

    it('does not save route when session is not active', async () => {
      await sessionRestorationService.saveRoute('/quiz');
      const snapshot = await sessionRestorationService.getSnapshot();
      expect(snapshot).toBeNull();
    });
  });

  describe('clearSnapshot', () => {
    it('removes the snapshot', async () => {
      await sessionRestorationService.beginSession();
      await sessionRestorationService.saveRoute('/settings');
      await sessionRestorationService.clearSnapshot();

      const snapshot = await sessionRestorationService.getSnapshot();
      expect(snapshot).toBeNull();
    });
  });

  describe('captureOnCrash', () => {
    it('preserves the active flag so next launch detects the crash', async () => {
      await sessionRestorationService.beginSession();
      await sessionRestorationService.saveRoute('/course-viewer');
      await sessionRestorationService.captureOnCrash();

      // Simulate app restart: check crash detection
      const crashed = await sessionRestorationService.detectCrash();
      expect(crashed).toBe(true);

      const snapshot = await sessionRestorationService.getSnapshot();
      expect(snapshot!.route).toBe('/course-viewer');
    });
  });

  describe('full crash-recovery lifecycle', () => {
    it('detects crash and restores the last route', async () => {
      // 1. App launches normally
      await sessionRestorationService.beginSession();

      // 2. User navigates to a quiz
      await sessionRestorationService.saveRoute('/quiz');

      // 3. App crashes (endSession is never called)
      // Simulate by not calling endSession

      // 4. App restarts — flag is still set from step 1
      const crashed = await sessionRestorationService.detectCrash();
      expect(crashed).toBe(true);

      const snapshot = await sessionRestorationService.getSnapshot();
      expect(snapshot!.route).toBe('/quiz');

      // 5. User chooses to restore — clear the snapshot and flag
      await sessionRestorationService.clearSnapshot();
      await sessionRestorationService.endSession();

      // 6. Next restart should NOT trigger recovery
      const crashedAgain = await sessionRestorationService.detectCrash();
      expect(crashedAgain).toBe(false);
    });

    it('does not trigger recovery after a clean shutdown', async () => {
      await sessionRestorationService.beginSession();
      await sessionRestorationService.saveRoute('/settings');
      await sessionRestorationService.endSession();

      const crashed = await sessionRestorationService.detectCrash();
      expect(crashed).toBe(false);
    });
  });
});
