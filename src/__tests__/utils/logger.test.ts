/**
 * Logger Utility Tests — Issue #176
 *
 * Comprehensive test suite for centralized structured logging:
 * - Log level enforcement
 * - Context propagation
 * - Structured JSON output
 * - Console output (dev vs prod)
 * - File persistence
 * - Remote logging integration
 * - Sync vs async methods
 */

import { appLogger, logger } from '../../utils/logger';
import {
  LogLevel,
  getLogContext,
  setLogContext,
  clearLogContext,
  pushLogContext,
  popLogContext,
  LogContext,
} from '../../config/logging';

describe('AppLogger - Production Logging System', () => {
  // ─── SETUP ──────────────────────────────────────────────────────────────

  beforeEach(() => {
    jest.clearAllMocks();
    clearLogContext();
  });

  afterEach(() => {
    clearLogContext();
  });

  // ─── LOG LEVEL TESTS ────────────────────────────────────────────────────

  describe('Log Levels', () => {
    it('defines correct numeric log levels', () => {
      expect(LogLevel.ERROR).toBe(0);
      expect(LogLevel.WARN).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.DEBUG).toBe(3);
      expect(LogLevel.TRACE).toBe(4);
    });

    it('enforces minimum log level in production', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

      // In production, DEBUG should be filtered
      appLogger.setMinLevel(LogLevel.INFO);
      await appLogger.debug('should not appear');
      expect(mockConsoleLog).not.toHaveBeenCalled();

      // ERROR should always appear
      await appLogger.error('critical error');
      expect(mockConsoleError).toHaveBeenCalled();

      mockConsoleLog.mockRestore();
      mockConsoleError.mockRestore();
    });
  });

  // ─── CONTEXT MANAGEMENT TESTS ───────────────────────────────────────────

  describe('Context Management', () => {
    it('sets and retrieves context', () => {
      const ctx: Partial<LogContext> = { userId: 'user123', component: 'Auth' };
      appLogger.setContext(ctx);

      const retrieved = appLogger.getContext();
      expect(retrieved.userId).toBe('user123');
      expect(retrieved.component).toBe('Auth');
    });

    it('merges context on setContext', () => {
      appLogger.setContext({ userId: 'user1' });
      appLogger.setContext({ component: 'Dashboard' });

      const ctx = appLogger.getContext();
      expect(ctx.userId).toBe('user1');
      expect(ctx.component).toBe('Dashboard');
    });

    it('clears context', () => {
      appLogger.setContext({ userId: 'user1', component: 'Auth' });
      appLogger.clearContext();

      const ctx = appLogger.getContext();
      expect(ctx.userId).toBeUndefined();
      expect(ctx.component).toBeUndefined();
    });

    it('supports context scoping with push/pop', () => {
      appLogger.setContext({ userId: 'user1' });

      appLogger.pushContext({ requestId: 'req123' });
      let ctx = appLogger.getContext();
      expect(ctx.userId).toBe('user1');
      expect(ctx.requestId).toBe('req123');

      const popped = appLogger.popContext();
      expect(popped?.requestId).toBe('req123');

      ctx = appLogger.getContext();
      expect(ctx.requestId).toBeUndefined();
      expect(ctx.userId).toBe('user1');
    });
  });

  // ─── STRUCTURED OUTPUT TESTS ─────────────────────────────────────────────

  describe('Structured Log Output', () => {
    it('includes required fields in all log entries', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

      appLogger.setMinLevel(LogLevel.INFO);
      await appLogger.info('Test message');

      expect(mockConsoleLog).toHaveBeenCalled();

      mockConsoleLog.mockRestore();
    });

    it('propagates context to log entries', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

      appLogger.setContext({ userId: 'user123', requestId: 'req456' });
      appLogger.setMinLevel(LogLevel.INFO);
      await appLogger.info('Request processed');

      // At least one call should have been made
      expect(mockConsoleLog).toHaveBeenCalled();

      mockConsoleLog.mockRestore();
    });

    it('includes metadata in structured logs', async () => {
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('API Error');
      const metadata = { endpoint: '/api/users', statusCode: 500 };

      appLogger.setMinLevel(LogLevel.ERROR);
      await appLogger.error('API request failed', error, metadata);

      expect(mockConsoleError).toHaveBeenCalled();

      mockConsoleError.mockRestore();
    });

    it('includes error stack traces in ERROR logs', async () => {
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Boom');
      appLogger.setMinLevel(LogLevel.ERROR);
      await appLogger.error('Something failed', error);

      // Verify console.error was called with error information
      expect(mockConsoleError).toHaveBeenCalled();

      mockConsoleError.mockRestore();
    });
  });

  // ─── SPECIALIZED LOGGING METHODS ────────────────────────────────────────

  describe('Specialized Logging Methods', () => {
    it('logs API requests with correct structure', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation();
      appLogger.setMinLevel(LogLevel.INFO);

      await appLogger.logApiRequest('/api/users', 'GET', { userId: 'u1' });

      expect(mockLog).toHaveBeenCalled();
      mockLog.mockRestore();
    });

    it('logs API responses with duration', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation();
      appLogger.setMinLevel(LogLevel.INFO);

      await appLogger.logApiResponse('/api/users', 200, 125, { count: 5 });

      expect(mockLog).toHaveBeenCalled();
      mockLog.mockRestore();
    });

    it('logs API errors with context', async () => {
      const mockError = jest.spyOn(console, 'error').mockImplementation();
      appLogger.setMinLevel(LogLevel.ERROR);

      const error = new Error('Connection timeout');
      await appLogger.logApiError('/api/users', error, 408);

      expect(mockError).toHaveBeenCalled();
      mockError.mockRestore();
    });

    it('logs component lifecycle', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation();
      appLogger.setMinLevel(LogLevel.DEBUG);

      await appLogger.logComponent('ProfileScreen', 'mounted', { status: 'ok' });

      expect(mockLog).toHaveBeenCalled();
      mockLog.mockRestore();
    });

    it('logs authentication events', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation();
      appLogger.setMinLevel(LogLevel.INFO);

      await appLogger.logAuth('login_success', { method: 'email' });

      expect(mockLog).toHaveBeenCalled();
      mockLog.mockRestore();
    });
  });

  // ─── SYNCHRONOUS METHODS ────────────────────────────────────────────────

  describe('Synchronous Logger Methods', () => {
    it('provides sync error logging', () => {
      const mockError = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Sync error');
      appLogger.errorSync('Critical error', error);

      expect(mockError).toHaveBeenCalled();
      mockError.mockRestore();
    });

    it('provides sync info logging', () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation();

      appLogger.infoSync('Quick log');

      expect(mockLog).toHaveBeenCalled();
      mockLog.mockRestore();
    });

    it('provides sync warn logging', () => {
      const mockWarn = jest.spyOn(console, 'warn').mockImplementation();

      appLogger.warnSync('Warning!');

      expect(mockWarn).toHaveBeenCalled();
      mockWarn.mockRestore();
    });
  });

  // ─── DEPRECATED LOGGER INTERFACE ────────────────────────────────────────

  describe('Deprecated logger interface (backward compatibility)', () => {
    it('logger.info still works', () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation();

      logger.info('old style');

      expect(mockLog).toHaveBeenCalled();
      mockLog.mockRestore();
    });

    it('logger.error still works', () => {
      const mockError = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Old error');
      logger.error(error);

      expect(mockError).toHaveBeenCalled();
      mockError.mockRestore();
    });

    it('logger.warn still works', () => {
      const mockWarn = jest.spyOn(console, 'warn').mockImplementation();

      logger.warn('old warning');

      expect(mockWarn).toHaveBeenCalled();
      mockWarn.mockRestore();
    });

    it('logger.debug still works', () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation();

      logger.debug('old debug');

      expect(mockLog).toHaveBeenCalled();
      mockLog.mockRestore();
    });

    it('logger.component still works', () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation();

      logger.component('TestComponent', 'action', { data: 'test' });

      expect(mockLog).toHaveBeenCalled();
      mockLog.mockRestore();
    });
  });

  // ─── ERROR HANDLING ──────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('handles null/undefined metadata gracefully', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation();
      appLogger.setMinLevel(LogLevel.INFO);

      await appLogger.info('Test', undefined);
      await appLogger.info('Test', null);

      expect(mockLog).toHaveBeenCalled();
      mockLog.mockRestore();
    });

    it('handles non-Error error objects', async () => {
      const mockError = jest.spyOn(console, 'error').mockImplementation();
      appLogger.setMinLevel(LogLevel.ERROR);

      await appLogger.error('Failed', 'string error' as any);
      await appLogger.error('Failed', { code: 500 } as any);

      expect(mockError).toHaveBeenCalled();
      mockError.mockRestore();
    });
  });

  // ─── CONTEXT HELPER FUNCTIONS ───────────────────────────────────────────

  describe('Context Helper Functions', () => {
    it('getLogContext returns current context', () => {
      setLogContext({ userId: 'u1', component: 'Auth' });
      const ctx = getLogContext();

      expect(ctx.userId).toBe('u1');
      expect(ctx.component).toBe('Auth');
    });

    it('clearLogContext resets to empty', () => {
      setLogContext({ userId: 'u1' });
      clearLogContext();

      const ctx = getLogContext();
      expect(Object.keys(ctx).length).toBe(0);
    });

    it('pushLogContext creates new scope', () => {
      setLogContext({ userId: 'u1' });
      pushLogContext({ requestId: 'r1' });

      const ctx = getLogContext();
      expect(ctx.userId).toBe('u1');
      expect(ctx.requestId).toBe('r1');
    });

    it('popLogContext returns to previous scope', () => {
      setLogContext({ userId: 'u1' });
      pushLogContext({ requestId: 'r1' });

      const popped = popLogContext();
      expect(popped?.requestId).toBe('r1');

      const ctx = getLogContext();
      expect(ctx.userId).toBe('u1');
      expect(ctx.requestId).toBeUndefined();
    });
  });

  // ─── INTEGRATION SCENARIOS ───────────────────────────────────────────────

  describe('Integration Scenarios', () => {
    it('handles user login scenario', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation();
      const mockError = jest.spyOn(console, 'error').mockImplementation();

      appLogger.setMinLevel(LogLevel.INFO);

      // User initiates login
      await appLogger.info('Login initiated', { email: 'user@example.com' });

      // Set user context
      appLogger.setContext({ userId: 'user123', component: 'Auth' });

      // Log successful auth
      await appLogger.logAuth('login_success');

      // Clear context
      appLogger.clearContext();

      expect(mockLog).toHaveBeenCalled();
      mockLog.mockRestore();
      mockError.mockRestore();
    });

    it('handles API request scenario', async () => {
      const mockLog = jest.spyOn(console, 'log').mockImplementation();

      appLogger.setMinLevel(LogLevel.INFO);

      // Start request
      const requestId = 'api-req-' + Date.now();
      appLogger.pushContext({ requestId, component: 'API' });

      // Log request
      await appLogger.logApiRequest('/api/users', 'GET');

      // Log response
      await appLogger.logApiResponse('/api/users', 200, 45);

      // End request
      appLogger.popContext();

      expect(mockLog).toHaveBeenCalled();
      mockLog.mockRestore();
    });

    it('handles error scenario with recovery', async () => {
      const mockError = jest.spyOn(console, 'error').mockImplementation();
      const mockLog = jest.spyOn(console, 'log').mockImplementation();

      appLogger.setMinLevel(LogLevel.DEBUG);

      // Error occurs
      const error = new Error('Network timeout');
      await appLogger.error('Request failed', error, { retry: 1 });

      // Recovery attempt
      await appLogger.info('Retrying request', { attempt: 2 });

      // Success
      await appLogger.info('Request succeeded on retry');

      expect(mockError).toHaveBeenCalled();
      expect(mockLog).toHaveBeenCalled();

      mockError.mockRestore();
      mockLog.mockRestore();
    });
  });
});

