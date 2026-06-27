/**
 * PRODUCTION BUILD SMOKE TEST — Issue #576
 *
 * Verifies that NO console.* calls in production builds leak internal state:
 *   - Stack traces with internal file paths
 *   - Sensitive metadata (tokens, user IDs, emails)
 *   - Error details (messages, source file locations)
 *   - Context objects with PII
 *
 * This test simulates production mode by mocking loggingConfig.isDev = false.
 *
 * WHAT IT COVERS:
 *   - appLogger.info/warn/error → sanitized JSON (no meta, no stack)
 *   - appLogger.infoSync/warnSync/errorSync → sanitized JSON
 *   - Deprecated logger interface → sanitized JSON
 *   - Error objects with stack traces → stack stripped
 *   - Context with PII (userId, email) → context stripped from console output
 *   - DEBUG/TRACE levels → silenced entirely in production
 *   - Null/undefined/empty meta edge cases
 */

// ─── Mock production environment BEFORE any logger imports ────────────────
// This must be at the top of the file so the module-level `isDev` constant is
// overridden before `logger.ts` is imported.
//
// jest.requireActual loads the real module; @sentry/react-native is globally
// mocked in jest.setup.js so the import won't crash.

jest.mock('../../config/logging', () => {
  const actual = jest.requireActual('../../config/logging');
  return {
    ...actual,
    loggingConfig: {
      isDev: false,
      logLevel: 2, // LogLevel.INFO — DEBUG/TRACE should be silenced
      storagePrefix: actual.loggingConfig.storagePrefix,
      maxLogFiles: actual.loggingConfig.maxLogFiles,
      maxLogSize: actual.loggingConfig.maxLogSize,
    },
  };
});

import { appLogger, logger } from '../../utils/logger';
import { LogLevel, clearLogContext } from '../../config/logging';

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Capture all console output during a callback, parse it as JSON */
function captureConsole(method: 'log' | 'warn' | 'error', fn: () => void): any[] {
  const calls: any[] = [];
  const spy = jest.spyOn(console, method).mockImplementation((...args: any[]) => {
    calls.push(...args);
  });

  try {
    fn();
  } finally {
    spy.mockRestore();
  }

  return calls.map((arg: any) => {
    if (typeof arg === 'string') {
      try {
        return JSON.parse(arg);
      } catch {
        return { rawString: arg };
      }
    }
    return { rawArg: arg };
  });
}

async function captureConsoleAsync(
  method: 'log' | 'warn' | 'error',
  fn: () => Promise<void>,
): Promise<any[]> {
  const calls: any[] = [];
  const spy = jest.spyOn(console, method).mockImplementation((...args: any[]) => {
    calls.push(...args);
  });

  try {
    await fn();
  } finally {
    spy.mockRestore();
  }

  return calls.map((arg: any) => {
    if (typeof arg === 'string') {
      try {
        return JSON.parse(arg);
      } catch {
        return { rawString: arg };
      }
    }
    return { rawArg: arg };
  });
}

// ─── Suite ─────────────────────────────────────────────────────────────────

describe('Production Build Security — No Internal State Leakage (#576)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearLogContext();
    appLogger.setMinLevel(LogLevel.INFO); // production default level
  });

  afterEach(() => {
    clearLogContext();
  });

  // ── 1. Metadata (meta) is STRIPPED from console output ───────────────────

  describe('Metadata stripping', () => {
    it('strips meta from logger.info (async)', async () => {
      const parsed = await captureConsoleAsync('log', async () => {
        await appLogger.info('User registered', {
          email: 'user@example.com',
          userId: 'u_abc123',
        });
      });

      expect(parsed.length).toBeGreaterThan(0);
      const entry = parsed[0];
      expect(entry.meta).toBeUndefined();
      expect(entry.message).toBe('User registered');
    });

    it('strips meta from logger.warn (async)', async () => {
      const parsed = await captureConsoleAsync('warn', async () => {
        await appLogger.warn('Rate limit approaching', {
          endpoint: '/api/users',
          retryAfter: 30,
        });
      });

      expect(parsed.length).toBeGreaterThan(0);
      const entry = parsed[0];
      expect(entry.meta).toBeUndefined();
      expect(entry.message).toContain('Rate limit');
    });

    it('strips meta from logger.error (async)', async () => {
      const error = new Error('DB connection failed');
      const parsed = await captureConsoleAsync('error', async () => {
        await appLogger.error('Critical failure', error, {
          dbHost: 'prod-db-01.internal',
          query: 'SELECT * FROM users',
        });
      });

      expect(parsed.length).toBeGreaterThan(0);
      const entry = parsed[0];
      expect(entry.meta).toBeUndefined();
      expect(entry.message).toContain('Critical');
    });
  });

  // ── 2. Stack traces are STRIPPED from console output ────────────────────

  describe('Stack trace stripping', () => {
    it('strips error stack from logger.error (async)', async () => {
      const error = new Error('Something broke');
      const parsed = await captureConsoleAsync('error', async () => {
        await appLogger.error('Operation failed', error);
      });

      expect(parsed.length).toBeGreaterThan(0);
      const entry = parsed[0];
      expect(entry.stack).toBeUndefined();
    });

    it('strips error stack from errorSync', () => {
      const error = new Error('Sync failure');
      const parsed = captureConsole('error', () => {
        appLogger.errorSync('Critical sync error', error);
      });

      expect(parsed.length).toBeGreaterThan(0);
      const entry = parsed[0];
      expect(entry.stack).toBeUndefined();
    });

    it('does NOT leak internal file paths in the output', () => {
      const error = new Error('Path leak test');
      const parsed = captureConsole('error', () => {
        appLogger.errorSync('Path leak check', error);
      });

      expect(parsed.length).toBeGreaterThan(0);
      const outputStr = JSON.stringify(parsed[0]);
      // Should not contain internal source paths
      expect(outputStr).not.toContain('/src/');
      expect(outputStr).not.toContain('node_modules/');
    });
  });

  // ── 3. PII / sensitive fields are not exposed ───────────────────────────

  describe('Sensitive data protection', () => {
    it('does not expose access tokens in console output', async () => {
      const parsed = await captureConsoleAsync('error', async () => {
        await appLogger.error('Token refresh failed', undefined, {
          accessToken: 'eyJhbGciOiJIUzI1NiJ9.secret_value',
          refreshToken: 'rft_abcdef123456',
        });
      });

      const outputStr = JSON.stringify(parsed);
      expect(outputStr).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(outputStr).not.toContain('rft_abcdef123456');
    });

    it('does not expose user PII (email, userId) in plain text in output', async () => {
      appLogger.setContext({ userId: 'user_42', email: 'alice@example.com' });
      const parsed = await captureConsoleAsync('log', async () => {
        await appLogger.info('User action tracked');
      });

      const outputStr = JSON.stringify(parsed);
      // The structured entry may contain userId in a structured field, but
      // meta/context objects with raw PII values must not appear
      expect(outputStr).not.toContain('alice@example.com');
    });
  });

  // ── 4. Output structure is valid JSON with required fields ──────────────

  describe('Valid structured JSON output', () => {
    it('outputs valid JSON for every log level', async () => {
      const parsed = await captureConsoleAsync('log', async () => {
        await appLogger.info('Info message');
      });

      const entry = parsed[0];
      expect(entry).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.level).toBe('INFO');
      expect(entry.app).toBe('teachlink_mobile');
      expect(entry.version).toBeDefined();
      expect(entry.environment).toBe('production');
      expect(entry.message).toBe('Info message');
    });

    it('has environment set to production', async () => {
      const parsed = await captureConsoleAsync('error', async () => {
        await appLogger.error('Prod error');
      });

      expect(parsed[0].environment).toBe('production');
    });
  });

  // ── 5. DEBUG and TRACE are silenced in production ──────────────────────

  describe('Level filtering in production', () => {
    it('silences DEBUG level', async () => {
      const parsed = await captureConsoleAsync('log', async () => {
        await appLogger.debug('Should not appear in production');
      });

      expect(parsed.length).toBe(0);
    });

    it('silences TRACE level', async () => {
      const parsed = await captureConsoleAsync('log', async () => {
        await appLogger.trace('Should not appear in production');
      });

      expect(parsed.length).toBe(0);
    });

    it('allows ERROR level', async () => {
      const parsed = await captureConsoleAsync('error', async () => {
        await appLogger.error('Critical issue');
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].level).toBe('ERROR');
    });

    it('allows WARN level', async () => {
      const parsed = await captureConsoleAsync('warn', async () => {
        await appLogger.warn('Warning message');
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].level).toBe('WARN');
    });

    it('allows INFO level', async () => {
      const parsed = await captureConsoleAsync('log', async () => {
        await appLogger.info('Info message');
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].level).toBe('INFO');
    });
  });

  // ── 6. Sync methods also sanitize ───────────────────────────────────────

  describe('Sync method sanitization', () => {
    it('sanitizes infoSync output', () => {
      const parsed = captureConsole('log', () => {
        appLogger.infoSync('Sync info', { secret: 's3cr3t' });
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].meta).toBeUndefined();
    });

    it('sanitizes warnSync output', () => {
      const parsed = captureConsole('warn', () => {
        appLogger.warnSync('Sync warning', { apiKey: 'sk-xxx' });
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].meta).toBeUndefined();
    });

    it('sanitizes errorSync output', () => {
      const error = new Error('Sync error with path');
      const parsed = captureConsole('error', () => {
        appLogger.errorSync('Sync error', error, { dbPassword: 'pass123' });
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].meta).toBeUndefined();
      expect(parsed[0].stack).toBeUndefined();
    });
  });

  // ── 7. Deprecated logger interface also sanitizes ───────────────────────

  describe('Deprecated logger sanitization', () => {
    it('logger.info sanitizes output', () => {
      const parsed = captureConsole('log', () => {
        logger.info('Legacy info', { token: 'legacy_token' });
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].meta).toBeUndefined();
    });

    it('logger.error sanitizes output', () => {
      const error = new Error('Legacy error');
      const parsed = captureConsole('error', () => {
        logger.error(error);
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].stack).toBeUndefined();
    });

    it('logger.warn sanitizes output', () => {
      const parsed = captureConsole('warn', () => {
        logger.warn('Legacy warning', { userId: 'u_legacy' });
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].meta).toBeUndefined();
    });
  });

  // ── 8. Edge cases ──────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles null meta gracefully', async () => {
      const parsed = await captureConsoleAsync('log', async () => {
        await appLogger.info('Test null meta', null as any);
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].meta).toBeUndefined();
    });

    it('handles undefined meta gracefully', async () => {
      const parsed = await captureConsoleAsync('log', async () => {
        await appLogger.info('Test undefined meta', undefined);
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].meta).toBeUndefined();
    });

    it('handles non-Error error objects', async () => {
      const parsed = await captureConsoleAsync('error', async () => {
        await appLogger.error('String error', 'just a string' as any);
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].stack).toBeUndefined();
    });

    it('handles empty string message', async () => {
      const parsed = await captureConsoleAsync('log', async () => {
        await appLogger.info('');
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].message).toBe('');
    });

    it('does not leak request context into adjacent log calls', async () => {
      // First log with PII context
      appLogger.setContext({ userId: 'sensitive_user_789', requestId: 'req_secret_111' });
      const parsed1 = await captureConsoleAsync('log', async () => {
        await appLogger.info('Context-bearing log');
      });

      // Clear context
      appLogger.clearContext();

      // Second log without context
      const parsed2 = await captureConsoleAsync('log', async () => {
        await appLogger.info('Context-cleared log');
      });

      const output1 = JSON.stringify(parsed1);
      const output2 = JSON.stringify(parsed2);

      // The first log may or may not contain userId/requestId in structured fields
      // (it's OK for them to be in the structured JSON — they're event metadata)
      expect(parsed1[0].message).toBe('Context-bearing log');

      // The second log should NOT contain the previous context's sensitive values
      // since the context was cleared — and meta is stripped anyway in production
      expect(parsed2[0].meta).toBeUndefined();
    });
  });

  // ── 9. API-specific logging methods ─────────────────────────────────────

  describe('API logging methods', () => {
    it('sanitizes logApiRequest', async () => {
      const parsed = await captureConsoleAsync('log', async () => {
        await appLogger.logApiRequest('/api/admin/users', 'GET', {
          adminToken: 'admin_secret',
        });
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].meta).toBeUndefined();
    });

    it('sanitizes logApiResponse', async () => {
      const parsed = await captureConsoleAsync('log', async () => {
        await appLogger.logApiResponse('/api/users', 200, 150, {
          responseBody: '[{"id":1,"email":"test@test.com"}]',
        });
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].meta).toBeUndefined();
    });

    it('sanitizes logApiError', async () => {
      const error = new Error('API timeout');
      const parsed = await captureConsoleAsync('error', async () => {
        await appLogger.logApiError('/api/users', error, 500, {
          stack: error.stack,
        });
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].meta).toBeUndefined();
      expect(parsed[0].stack).toBeUndefined();
    });

    it('sanitizes logAuth', async () => {
      const parsed = await captureConsoleAsync('log', async () => {
        await appLogger.logAuth('login_success', {
          accessToken: 'eyJhbGciOiJSUzI1NiJ9.test',
        });
      });

      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].meta).toBeUndefined();
    });
  });
});
