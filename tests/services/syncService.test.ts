import syncService from '../../src/services/syncService';

jest.useFakeTimers();

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  // Always start from a clean stopped state
  syncService.stopAutoSync();
});

afterEach(() => {
  syncService.stopAutoSync();
});

describe('SyncService — background lifecycle', () => {
  describe('startAutoSync()', () => {
    it('creates a recurring interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      syncService.startAutoSync();
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      setIntervalSpy.mockRestore();
    });

    it('is idempotent — a second call before stopping does not add another interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      syncService.startAutoSync();
      syncService.startAutoSync(); // should no-op due to guard
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      setIntervalSpy.mockRestore();
    });
  });

  describe('stopAutoSync()', () => {
    it('clears the interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      syncService.startAutoSync();
      syncService.stopAutoSync();
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      clearIntervalSpy.mockRestore();
    });

    it('is safe to call when not running', () => {
      expect(() => syncService.stopAutoSync()).not.toThrow();
    });

    it('does not call clearInterval when already stopped', () => {
      syncService.startAutoSync();
      syncService.stopAutoSync();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      syncService.stopAutoSync(); // already stopped
      expect(clearIntervalSpy).not.toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('background → foreground cycle', () => {
    it('can restart after being stopped', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      syncService.startAutoSync();
      syncService.stopAutoSync();
      syncService.startAutoSync(); // restart after background

      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
      setIntervalSpy.mockRestore();
    });

    it('schedules sync callback on the configured interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      syncService.startAutoSync();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
      setIntervalSpy.mockRestore();
    });
  });
});
