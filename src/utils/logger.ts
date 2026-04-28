/**
 * Centralized logging utility for TeachLink Mobile.
 *
 * - Development: all log levels are output to the Metro bundler terminal.
 * - Production: only errors are logged; info/warn/debug are silenced.
 *
 * Import and use this instead of direct console.* calls throughout the codebase.
 */

/** Supported log severity levels. */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Safe __DEV__ check — falls back gracefully in non-RN environments (e.g. Jest).
const isDev =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const logger = {
  /**
   * Log informational messages. Only emitted in development.
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.log('ℹ️ [INFO]', ...args);
    }
  },

  /**
   * Log warning messages. Only emitted in development.
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('⚠️ [WARN]', ...args);
    }
  },

  /**
   * Log error messages. Always emitted, including in production.
   * Prints the stack trace when the first argument is an Error instance.
   */
  error: (...args: any[]) => {
    console.error('❌ [ERROR]', ...args);

    if (args[0] instanceof Error) {
      console.error('Stack:', args[0].stack);
    }
  },

  /**
   * Log debug-level messages. Only emitted in development.
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.log('🐛 [DEBUG]', ...args);
    }
  },

  /**
   * Log a component lifecycle event. Only emitted in development.
   */
  component: (componentName: string, action: string, data?: any) => {
    if (isDev) {
      console.log(`📱 [${componentName}] ${action}`, data ?? '');
    }
  },
};

export default logger;
