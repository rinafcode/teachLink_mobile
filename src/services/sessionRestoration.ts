import AsyncStorage from '@react-native-async-storage/async-storage';

import logger from '../utils/logger';

const SESSION_ACTIVE_KEY = '@teachlink_session_active';
const SESSION_SNAPSHOT_KEY = '@teachlink_session_snapshot';

export interface SessionSnapshot {
  route: string;
  params?: Record<string, string>;
  timestamp: number;
}

/**
 * SessionRestorationService manages crash detection and session recovery.
 *
 * How it works:
 * 1. On app launch, `beginSession()` sets a "session-active" flag in AsyncStorage.
 * 2. On every navigation, `saveRoute()` persists the current route + params.
 * 3. On app shutdown (AppState listener), `endSession()` clears the "session-active" flag.
 * 4. On next launch, `detectCrash()` checks if the flag was cleared.
 *    If it's still set, the previous session didn't shut down cleanly → crash detected.
 *    `getSnapshot()` then returns the last saved route so the user can be offered restoration.
 */
class SessionRestorationService {
  private isActive: boolean = false;

  /**
   * Mark the session as active. Call this on app startup.
   * If the previous session's active flag wasn't cleared, this is a crash recovery scenario.
   */
  async beginSession(): Promise<void> {
    try {
      await AsyncStorage.setItem(SESSION_ACTIVE_KEY, '1');
      this.isActive = true;
      logger.info('SessionRestoration: Session marked as active');
    } catch (error) {
      logger.error('SessionRestoration: Failed to begin session', error);
    }
  }

  /**
   * Clear the session-active flag. Call this on clean app shutdown.
   * Also clears the snapshot since the session completed cleanly.
   */
  async endSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSION_ACTIVE_KEY);
      await AsyncStorage.removeItem(SESSION_SNAPSHOT_KEY);
      this.isActive = false;
      logger.info('SessionRestoration: Session ended cleanly');
    } catch (error) {
      logger.error('SessionRestoration: Failed to end session', error);
    }
  }

  /**
   * Check whether the previous session ended without a clean shutdown.
   * Returns true if the app crashed in the previous run.
   */
  async detectCrash(): Promise<boolean> {
    try {
      const flag = await AsyncStorage.getItem(SESSION_ACTIVE_KEY);
      return flag === '1';
    } catch (error) {
      logger.error('SessionRestoration: Failed to detect crash', error);
      return false;
    }
  }

  /**
   * Save the current route and optional params to disk.
   * Called on every navigation change.
   */
  async saveRoute(route: string, params?: Record<string, string>): Promise<void> {
    if (!this.isActive) return;

    try {
      const snapshot: SessionSnapshot = {
        route,
        params,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (error) {
      logger.error('SessionRestoration: Failed to save route', error);
    }
  }

  /**
   * Get the last saved session snapshot, or null if none exists.
   * Used after crash detection to determine where to restore the user.
   */
  async getSnapshot(): Promise<SessionSnapshot | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_SNAPSHOT_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SessionSnapshot;
    } catch (error) {
      logger.error('SessionRestoration: Failed to read snapshot', error);
      return null;
    }
  }

  /**
   * Clear the snapshot after the user dismisses or acts on the restoration prompt.
   */
  async clearSnapshot(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSION_SNAPSHOT_KEY);
      logger.info('SessionRestoration: Snapshot cleared');
    } catch (error) {
      logger.error('SessionRestoration: Failed to clear snapshot', error);
    }
  }

  /**
   * Capture the current session state at the moment of a crash.
   * Called by crashReportingService when a fatal error is caught.
   * This ensures the session-active flag is preserved so next launch detects the crash.
   *
   * The flag is already set by `beginSession()`, so this is a no-op in normal flow.
   * The snapshot is also already saved by `saveRoute()`.
   * This method exists as an explicit API for crash reporting to call if needed.
   */
  async captureOnCrash(): Promise<void> {
    logger.info('SessionRestoration: Crash detected, session state preserved for next launch');
    this.isActive = true;
  }
}

export const sessionRestorationService = new SessionRestorationService();
export default sessionRestorationService;
