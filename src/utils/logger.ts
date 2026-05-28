/**
 * CENTRALIZED LOGGER WRAPPER — Issue #176
 *
 * This utility provides structured, production-grade logging with:
 * - Multiple log levels (ERROR, WARN, INFO, DEBUG, TRACE)
 * - Automatic context propagation (userId, requestId, component)
 * - Structured JSON output (timestamp, level, context, message)
 * - File persistence via AsyncStorage with rotation
 * - Remote logging via Sentry for critical errors
 * - Console output (dev pretty-print, prod structured)
 * - Zero runtime overhead in production
 *
 * USAGE PATTERNS:
 *
 * 1. Simple logging (implicit context):
 *    AppLogger.info('User logged in');
 *    AppLogger.error('API request failed', error);
 *
 * 2. Context-aware logging:
 *    AppLogger.setContext({ userId: '123', component: 'Auth' });
 *    AppLogger.info('Processing user request');
 *    AppLogger.clearContext();
 *
 * 3. Request-scoped logging:
 *    AppLogger.pushContext({ requestId: generateId() });
 *    try {
 *      await apiCall();
 *      AppLogger.info('Request succeeded');
 *    } finally {
 *      AppLogger.popContext();
 *    }
 *
 * 4. Extra metadata:
 *    AppLogger.info('Course completed', {
 *      courseId: '456',
 *      duration: 2500,
 *      score: 95
 *    });
 */

import {
  LogLevel,
  LogContext,
  StructuredLogEntry,
  getLogContext,
  setLogContext,
  pushLogContext,
  popLogContext,
  clearLogContext as clearCtx,
  persistLogEntry,
  sendToRemoteLogging,
  loggingConfig,
} from '../config/logging';

// ─── LOG LEVEL NAMES ──────────────────────────────────────────────────────

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.TRACE]: 'TRACE',
};

const LEVEL_EMOJI: Record<LogLevel, string> = {
  [LogLevel.ERROR]: '❌',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.INFO]: 'ℹ️',
  [LogLevel.DEBUG]: '🐛',
  [LogLevel.TRACE]: '🔍',
};

// ─── PRODUCTION BUILD INFORMATION ─────────────────────────────────────

// @ts-ignore - Available in Expo/RN environment
const APP_VERSION = (typeof __EXPO_VERSION__ !== 'undefined' ? __EXPO_VERSION__ : '1.0.0');
const PACKAGE_ID = 'teachlink_mobile';

// ─── LOGGER IMPLEMENTATION ────────────────────────────────────────────────

class AppLogger {
  private minLevel: LogLevel = loggingConfig.logLevel;

  /**
   * Set minimum log level for filtering
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Set context for subsequent log entries
   */
  setContext(ctx: Partial<LogContext>): void {
    setLogContext(ctx);
  }

  /**
   * Get current context
   */
  getContext(): LogContext {
    return getLogContext();
  }

  /**
   * Push context (creates new scope, preserves parent)
   */
  pushContext(ctx: Partial<LogContext>): void {
    pushLogContext(ctx);
  }

  /**
   * Pop context (returns to parent scope)
   */
  popContext(): LogContext | undefined {
    return popLogContext();
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    clearCtx();
  }

  /**
   * Format context for display
   */
  private formatContext(): string {
    const ctx = getLogContext();
    const parts = [];

    if (ctx.userId) parts.push(`User:${ctx.userId}`);
    if (ctx.requestId) parts.push(`Req:${ctx.requestId}`);
    if (ctx.component) parts.push(`Cmp:${ctx.component}`);
    if (ctx.action) parts.push(`Act:${ctx.action}`);

    return parts.length > 0 ? ` [${parts.join(', ')}]` : '';
  }

  /**
   * Build structured log entry
   */
  private buildEntry(
    level: LogLevel,
    message: string,
    meta?: any,
    error?: Error
  ): StructuredLogEntry {
    const ctx = getLogContext();

    return {
      timestamp: new Date().toISOString(),
      level: LEVEL_NAMES[level],
      app: 'teachlink_mobile',
      version: APP_VERSION,
      environment: loggingConfig.isDev ? 'development' : 'production',
      pid: String(process.pid || 0),
      userId: ctx.userId,
      requestId: ctx.requestId,
      component: ctx.component,
      action: ctx.action,
      duration: ctx.duration,
      status: ctx.status,
      message,
      meta: meta && Object.keys(meta).length > 0 ? meta : undefined,
      stack: error?.stack,
      source: error?.name,
    };
  }

  /**
   * Output to console (pretty or structured based on environment)
   */
  private outputToConsole(
    level: LogLevel,
    message: string,
    entry: StructuredLogEntry,
    error?: Error
  ): void {
    if (loggingConfig.isDev) {
      // Pretty-printed output with emoji + context
      const prefix = `${LEVEL_EMOJI[level]} [${LEVEL_NAMES[level]}]`;
      const context = this.formatContext();
      const fullMessage = `${prefix}${context} ${message}`;

      switch (level) {
        case LogLevel.ERROR:
          console.error(fullMessage, entry.meta);
          if (error) console.error('Stack:', error.stack);
          break;
        case LogLevel.WARN:
          console.warn(fullMessage, entry.meta);
          break;
        default:
          console.log(fullMessage, entry.meta);
      }
    } else {
      // Production: structured JSON output
      switch (level) {
        case LogLevel.ERROR:
          console.error(JSON.stringify(entry));
          break;
        case LogLevel.WARN:
          console.warn(JSON.stringify(entry));
          break;
        case LogLevel.INFO:
          console.log(JSON.stringify(entry));
          break;
        // DEBUG and TRACE silenced in production
      }
    }
  }

  /**
   * Main logging implementation
   */
  private async log(
    level: LogLevel,
    message: string,
    meta?: any,
    error?: Error
  ): Promise<void> {
    // Early exit if below min level
    if (level > this.minLevel) {
      return;
    }

    // Build structured entry
    const entry = this.buildEntry(level, message, meta, error);

    // Output to console
    this.outputToConsole(level, message, entry, error);

    // Persist to storage
    await persistLogEntry(entry);

    // Send to remote logging
    sendToRemoteLogging(entry, error);
  }

  /**
   * ERROR level — Always logged
   * Use for: exceptions, failures, critical issues
   */
  async error(
    message: string,
    error?: Error | unknown,
    meta?: any
  ): Promise<void> {
    const err = error instanceof Error ? error : undefined;
    const errorMeta = !err && error ? { error: String(error) } : {};
    await this.log(LogLevel.ERROR, message, { ...errorMeta, ...meta }, err);
  }

  /**
   * WARN level — Always logged
   * Use for: recoverable issues, deprecated usage, warnings
   */
  async warn(message: string, meta?: any): Promise<void> {
    await this.log(LogLevel.WARN, message, meta);
  }

  /**
   * INFO level — Always logged
   * Use for: important events, state changes, milestones
   */
  async info(message: string, meta?: any): Promise<void> {
    await this.log(LogLevel.INFO, message, meta);
  }

  /**
   * DEBUG level — Dev only
   * Use for: diagnostic info, variable values, flow tracking
   */
  async debug(message: string, meta?: any): Promise<void> {
    await this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * TRACE level — Dev only, most verbose
   * Use for: function entry/exit, parameter values, detailed flow
   */
  async trace(message: string, meta?: any): Promise<void> {
    await this.log(LogLevel.TRACE, message, meta);
  }

  /**
   * Log API request
   */
  async logApiRequest(endpoint: string, method: string, meta?: any): Promise<void> {
    const ctx = getLogContext();
    await this.info(`API Request: ${method} ${endpoint}`, {
      endpoint,
      method,
      requestId: ctx.requestId,
      ...meta,
    });
  }

  /**
   * Log API response
   */
  async logApiResponse(
    endpoint: string,
    status: number,
    duration: number,
    meta?: any
  ): Promise<void> {
    const ctx = getLogContext();
    await this.info(`API Response: ${status} ${endpoint}`, {
      endpoint,
      status,
      duration,
      requestId: ctx.requestId,
      ...meta,
    });
  }

  /**
   * Log API error
   */
  async logApiError(
    endpoint: string,
    error: Error,
    statusCode?: number,
    meta?: any
  ): Promise<void> {
    const ctx = getLogContext();
    await this.error(
      `API Error: ${statusCode || '?'} ${endpoint}`,
      error,
      {
        endpoint,
        statusCode,
        requestId: ctx.requestId,
        ...meta,
      }
    );
  }

  /**
   * Log component lifecycle
   */
  async logComponent(
    componentName: string,
    action: string,
    meta?: any
  ): Promise<void> {
    await this.setContext({ component: componentName });
    await this.debug(`Component: ${action}`, meta);
  }

  /**
   * Log authentication event
   */
  async logAuth(action: string, meta?: any): Promise<void> {
    await this.setContext({ component: 'Auth' });
    await this.info(`Auth: ${action}`, meta);
  }

  /**
   * Synchronous versions for critical paths (no await needed)
   * These write immediately to console without async persistence
   */
  errorSync(message: string, error?: Error | unknown, meta?: any): void {
    const err = error instanceof Error ? error : undefined;
    const errorMeta = !err && error ? { error: String(error) } : {};
    const entry = this.buildEntry(LogLevel.ERROR, message, { ...errorMeta, ...meta }, err);
    this.outputToConsole(LogLevel.ERROR, message, entry, err);
    sendToRemoteLogging(entry, err);
  }

  warnSync(message: string, meta?: any): void {
    const entry = this.buildEntry(LogLevel.WARN, message, meta);
    this.outputToConsole(LogLevel.WARN, message, entry);
  }

  infoSync(message: string, meta?: any): void {
    const entry = this.buildEntry(LogLevel.INFO, message, meta);
    this.outputToConsole(LogLevel.INFO, message, entry);
  }
}

/**
 * Singleton instance
 */
export const appLogger = new AppLogger();

/**
 * Default export for backward compatibility
 */
export default appLogger;

/**
 * Named export
 */
export { AppLogger };

/**
 * DEPRECATED: Old logger interface for gradual migration
 * These are DEPRECATED in favor of AppLogger.
 * Will be removed after #176 migration completes.
 */
export const logger = {
  info: (...args: any[]) => appLogger.infoSync(String(args[0]), { args: args.slice(1) }),
  warn: (...args: any[]) => appLogger.warnSync(String(args[0]), { args: args.slice(1) }),
  error: (...args: any[]) => {
    const error = args[0] instanceof Error ? args[0] : undefined;
    appLogger.errorSync(String(args[0]), error, { args: args.slice(1) });
  },
  debug: (...args: any[]) => appLogger.infoSync(String(args[0]), { args: args.slice(1) }),
  component: (componentName: string, action: string, data?: any) =>
    appLogger.infoSync(`[${componentName}] ${action}`, data),
};

