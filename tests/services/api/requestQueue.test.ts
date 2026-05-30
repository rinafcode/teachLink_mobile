import requestQueue from '../../../src/services/api/requestQueue';

jest.useFakeTimers();

const mockApiClient = jest.fn(() => Promise.resolve({ data: {} }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  // Ensure monitoring is stopped before each test
  requestQueue.stopMonitoring();
});

afterEach(() => {
  requestQueue.stopMonitoring();
});

describe('RequestQueue — background lifecycle', () => {
  describe('startMonitoring()', () => {
    it('creates a polling interval when called', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      requestQueue.startMonitoring(mockApiClient);
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      setIntervalSpy.mockRestore();
    });

    it('is idempotent — calling twice does not create two intervals', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      requestQueue.startMonitoring(mockApiClient);
      requestQueue.startMonitoring(mockApiClient); // second call should no-op
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      setIntervalSpy.mockRestore();
    });
  });

  describe('stopMonitoring()', () => {
    it('clears the polling interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      requestQueue.startMonitoring(mockApiClient);
      requestQueue.stopMonitoring();
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      clearIntervalSpy.mockRestore();
    });

    it('is idempotent — calling when not running does not throw', () => {
      expect(() => requestQueue.stopMonitoring()).not.toThrow();
    });

    it('does not call clearInterval a second time if already stopped', () => {
      requestQueue.startMonitoring(mockApiClient);
      requestQueue.stopMonitoring();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      requestQueue.stopMonitoring(); // second call — already null
      expect(clearIntervalSpy).not.toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('resumeMonitoring()', () => {
    it('restarts the interval after it has been stopped', () => {
      requestQueue.startMonitoring(mockApiClient);
      requestQueue.stopMonitoring();

      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      requestQueue.resumeMonitoring();
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      setIntervalSpy.mockRestore();
    });

    it('is a no-op if startMonitoring was never called', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      requestQueue.resumeMonitoring(); // apiClientRef is null — should not throw
      expect(setIntervalSpy).not.toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });
  });

  describe('background → foreground cycle', () => {
    it('can cycle stop → resume multiple times without creating extra intervals', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      requestQueue.startMonitoring(mockApiClient); // 1st interval
      requestQueue.stopMonitoring();
      requestQueue.resumeMonitoring();             // 2nd interval
      requestQueue.stopMonitoring();
      requestQueue.resumeMonitoring();             // 3rd interval

      // Each resume creates exactly one new interval (previous was cleared)
      expect(setIntervalSpy).toHaveBeenCalledTimes(3);
      setIntervalSpy.mockRestore();
    });
  });
});
