import { LogLevel } from '../../utils/logger';

describe('logger utility', () => {
  describe('LogLevel enum', () => {
    it('exports the correct string values for each level', () => {
      expect(LogLevel.DEBUG).toBe('DEBUG');
      expect(LogLevel.INFO).toBe('INFO');
      expect(LogLevel.WARN).toBe('WARN');
      expect(LogLevel.ERROR).toBe('ERROR');
    });
  });

  describe('in development mode (__DEV__ = true)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    let devLogger: typeof import('../../utils/logger').logger;

    beforeAll(() => {
      (global as any).__DEV__ = true;
      jest.resetModules();
      devLogger = require('../../utils/logger').logger;
    });

    afterAll(() => {
      delete (global as any).__DEV__;
      jest.resetModules();
    });

    it('info() forwards to console.log with the INFO prefix', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      devLogger.info('hello world');
      expect(spy).toHaveBeenCalledWith('ℹ️ [INFO]', 'hello world');
      spy.mockRestore();
    });

    it('info() forwards multiple arguments', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      devLogger.info('user:', { id: 1 });
      expect(spy).toHaveBeenCalledWith('ℹ️ [INFO]', 'user:', { id: 1 });
      spy.mockRestore();
    });

    it('warn() forwards to console.warn with the WARN prefix', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      devLogger.warn('low disk space');
      expect(spy).toHaveBeenCalledWith('⚠️ [WARN]', 'low disk space');
      spy.mockRestore();
    });

    it('debug() forwards to console.log with the DEBUG prefix', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      devLogger.debug('raw payload', { foo: 'bar' });
      expect(spy).toHaveBeenCalledWith('🐛 [DEBUG]', 'raw payload', { foo: 'bar' });
      spy.mockRestore();
    });

    it('component() includes the component name and action', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      devLogger.component('ProfileScreen', 'mounted');
      expect(spy).toHaveBeenCalledWith('📱 [ProfileScreen] mounted', '');
      spy.mockRestore();
    });

    it('component() includes optional data when provided', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      devLogger.component('CourseList', 'updated', { count: 5 });
      expect(spy).toHaveBeenCalledWith('📱 [CourseList] updated', { count: 5 });
      spy.mockRestore();
    });
  });

  describe('error() — always logs regardless of environment', () => {
    // Re-import logger once for these tests without resetting module state.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { logger } = require('../../utils/logger');

    it('calls console.error with the ERROR prefix', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('something went wrong');
      expect(spy).toHaveBeenCalledWith('❌ [ERROR]', 'something went wrong');
      spy.mockRestore();
    });

    it('prints the stack trace when an Error instance is the first argument', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('boom');
      logger.error(err);
      expect(spy).toHaveBeenCalledWith('❌ [ERROR]', err);
      expect(spy).toHaveBeenCalledWith('Stack:', err.stack);
      spy.mockRestore();
    });

    it('does not print a stack trace for non-Error arguments', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('plain string error');
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });

  describe('in production mode (__DEV__ = false)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    let prodLogger: typeof import('../../utils/logger').logger;

    beforeAll(() => {
      (global as any).__DEV__ = false;
      jest.resetModules();
      prodLogger = require('../../utils/logger').logger;
    });

    afterAll(() => {
      delete (global as any).__DEV__;
      jest.resetModules();
    });

    it('info() is silent in production', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      prodLogger.info('should be silent');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('warn() is silent in production', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      prodLogger.warn('should be silent');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('debug() is silent in production', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      prodLogger.debug('should be silent');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('component() is silent in production', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      prodLogger.component('HomeScreen', 'mounted');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('error() still logs in production', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      prodLogger.error('prod error');
      expect(spy).toHaveBeenCalledWith('❌ [ERROR]', 'prod error');
      spy.mockRestore();
    });
  });
});
