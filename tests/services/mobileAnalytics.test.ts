import { mobileAnalyticsService } from '../../src/services/mobileAnalytics';
import { appLogger } from '../../src/utils/logger';
import { AnalyticsEvent } from '../../src/utils/trackingEvents';

jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    component: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    appLogger: mockLogger,
  };
});

describe('mobileAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs event payload when trackEvent is called', () => {
    mobileAnalyticsService.trackEvent(AnalyticsEvent.APP_LAUNCH, { launch_type: 'cold' });

    expect(appLogger.info).toHaveBeenCalled();
    expect(appLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Event: app_launch'),
      expect.any(String)
    );
  });

  it('tracks a screen and emits screen view logging', () => {
    mobileAnalyticsService.trackScreen('Home');

    expect(appLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Screen View: Home'),
      expect.objectContaining({ previous_screen: null })
    );
  });

  describe('Event Sampling Logic', () => {
    let randomSpy: jest.SpyInstance;

    beforeEach(() => {
      randomSpy = jest.spyOn(Math, 'random');
    });

    afterEach(() => {
      randomSpy.mockRestore();
    });

    it('always tracks critical events regardless of Math.random', () => {
      randomSpy.mockReturnValue(0.99);

      mobileAnalyticsService.trackEvent(AnalyticsEvent.APP_LAUNCH);
      mobileAnalyticsService.trackEvent(AnalyticsEvent.SESSION_START);
      mobileAnalyticsService.trackEvent(AnalyticsEvent.CRASH_REPORT);

      expect(appLogger.info).toHaveBeenCalledTimes(3);
    });

    it('skips non-critical events when Math.random is > 0.1', () => {
      randomSpy.mockReturnValue(0.15);

      mobileAnalyticsService.trackEvent(AnalyticsEvent.UI_CLICK);
      mobileAnalyticsService.trackEvent(AnalyticsEvent.SEARCH_QUERY);

      expect(appLogger.info).not.toHaveBeenCalled();
    });

    it('tracks non-critical events when Math.random is <= 0.1', () => {
      randomSpy.mockReturnValue(0.05);

      mobileAnalyticsService.trackEvent(AnalyticsEvent.UI_CLICK);

      expect(appLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Event: ui_click'),
        expect.any(String)
      );
    });

    it('verifies statistical distribution matches the 10% rate within a reasonable boundary over 2000 trials', () => {
      randomSpy.mockRestore(); // Use real random

      const totalTrials = 2000;
      const infoSpy = jest.spyOn(appLogger, 'info');

      for (let i = 0; i < totalTrials; i++) {
        mobileAnalyticsService.trackEvent(AnalyticsEvent.UI_CLICK);
      }

      const trackedCount = infoSpy.mock.calls.filter(call =>
        call[0].includes('Event: ui_click')
      ).length;

      const rate = trackedCount / totalTrials;

      expect(rate).toBeGreaterThanOrEqual(0.05);
      expect(rate).toBeLessThanOrEqual(0.15);

      infoSpy.mockRestore();
    });
  });
});
