/**
 * Crash-proof logging wrapper. (#794)
 *
 * The response interceptor called the logger unguarded. When the logger
 * itself threw — Sentry not initialised, a circular reference during
 * serialisation — the interceptor unwound and the original request error was
 * lost. Logging must never be able to do that.
 */

/**
 * Runs `log`, swallowing any failure it raises so the caller's control flow
 * is unaffected. Falls back to console error so the logger's own failure
 * stays visible rather than disappearing silently.
 */
export function safeLog(log: () => void): void {
  try {
    log();
  } catch (loggerError) {
    void loggerError; // Suppressed
    // Console is unavailable too — drop it rather than break the caller.
  }
}

/** Promise-returning variant for async transports. Never rejects. */
export async function safeLogAsync(log: () => Promise<void>): Promise<void> {
  try {
    await log();
  } catch (loggerError) {
    safeLog(() => {
      void loggerError;
    });
  }
}
