jest.mock('../../src/utils/logger', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        component: jest.fn(),
    },
}));

import { mobileAnalyticsService } from '../../src/services/mobileAnalytics';
import logger from '../../src/utils/logger';
import { AnalyticsEvent } from '../../src/utils/trackingEvents';

describe('mobileAnalyticsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('logs event payload when trackEvent is called', () => {
        mobileAnalyticsService.trackEvent(AnalyticsEvent.UI_CLICK, { button: 'save' });

        expect(logger.info).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Event: ui_click'),
            expect.any(String)
        );
    });

    it('tracks a screen and emits screen view logging', () => {
        mobileAnalyticsService.trackScreen('Home');

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('Screen View: Home'),
            expect.objectContaining({ previous_screen: null })
        );
    });
});
