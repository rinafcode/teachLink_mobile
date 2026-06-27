import { inAppReviewService, ReviewTrigger, DEFAULT_REVIEW_CONFIG } from '../../services/inAppReview';

describe('InAppReviewService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Initialize the service so isAvailable=true (set by the expo-store-review mock)
    await inAppReviewService.init();
    // Reset to default config in case a previous test mutated it
    inAppReviewService.setConfig(DEFAULT_REVIEW_CONFIG);
  });

  describe('Eligibility Checks', () => {
    it('should approve eligible user with all criteria met', async () => {
      const metrics = {
        installDate: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
        lastReviewRequestDate: null,
        reviewRequestCount: 0,
        coursesCompleted: 3,
        sessionCount: 10,
        doNotAskAgain: false,
      };

      const result = await inAppReviewService.requestReview(
        ReviewTrigger.COURSE_MILESTONE,
        metrics
      );

      expect(result.trigger).toBe(ReviewTrigger.COURSE_MILESTONE);
    });

    it('should reject if too soon after install', async () => {
      const metrics = {
        installDate: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        lastReviewRequestDate: null,
        reviewRequestCount: 0,
        coursesCompleted: 5,
        sessionCount: 10,
        doNotAskAgain: false,
      };

      const result = await inAppReviewService.requestReview(
        ReviewTrigger.COURSE_MILESTONE,
        metrics
      );

      expect(result.shown).toBe(false);
      expect(result.reason).toContain('Too soon after install');
    });

    it('should reject if too soon since last request', async () => {
      const metrics = {
        installDate: Date.now() - 100 * 24 * 60 * 60 * 1000, // 100 days ago
        lastReviewRequestDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        reviewRequestCount: 1,
        coursesCompleted: 5,
        sessionCount: 10,
        doNotAskAgain: false,
      };

      const result = await inAppReviewService.requestReview(
        ReviewTrigger.COURSE_MILESTONE,
        metrics
      );

      expect(result.shown).toBe(false);
      expect(result.reason).toContain('Too soon since last request');
    });

    it('should reject if max requests per year reached', async () => {
      const metrics = {
        installDate: Date.now() - 200 * 24 * 60 * 60 * 1000, // 200 days ago
        lastReviewRequestDate: Date.now() - 100 * 24 * 60 * 60 * 1000, // 100 days ago
        reviewRequestCount: 3,
        coursesCompleted: 10,
        sessionCount: 50,
        doNotAskAgain: false,
      };

      const result = await inAppReviewService.requestReview(
        ReviewTrigger.COURSE_MILESTONE,
        metrics
      );

      expect(result.shown).toBe(false);
      expect(result.reason).toContain('Maximum requests per year reached');
    });

    it('should reject if not enough courses completed', async () => {
      const metrics = {
        installDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
        lastReviewRequestDate: null,
        reviewRequestCount: 0,
        coursesCompleted: 1, // Need 2
        sessionCount: 10,
        doNotAskAgain: false,
      };

      const result = await inAppReviewService.requestReview(
        ReviewTrigger.COURSE_MILESTONE,
        metrics
      );

      expect(result.shown).toBe(false);
      expect(result.reason).toContain('Not enough courses completed');
    });

    it('should reject if not enough sessions', async () => {
      const metrics = {
        installDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
        lastReviewRequestDate: null,
        reviewRequestCount: 0,
        coursesCompleted: 5,
        sessionCount: 3, // Need 5
        doNotAskAgain: false,
      };

      const result = await inAppReviewService.requestReview(
        ReviewTrigger.COURSE_MILESTONE,
        metrics
      );

      expect(result.shown).toBe(false);
      expect(result.reason).toContain('Not enough sessions');
    });

    it('should respect doNotAskAgain preference', async () => {
      const metrics = {
        installDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
        lastReviewRequestDate: null,
        reviewRequestCount: 0,
        coursesCompleted: 5,
        sessionCount: 10,
        doNotAskAgain: true,
      };

      const result = await inAppReviewService.requestReview(
        ReviewTrigger.COURSE_MILESTONE,
        metrics
      );

      expect(result.shown).toBe(false);
      expect(result.reason).toContain('opted out');
    });
  });

  describe('Configuration', () => {
    it('should allow custom configuration', () => {
      const customConfig = {
        minDaysSinceInstall: 14,
        minDaysSinceLastRequest: 120,
        maxRequestsPerYear: 2,
        minCoursesCompleted: 5,
        minSessions: 10,
      };

      inAppReviewService.setConfig(customConfig);
      const config = inAppReviewService.getConfig();

      expect(config.minDaysSinceInstall).toBe(14);
      expect(config.minDaysSinceLastRequest).toBe(120);
      expect(config.maxRequestsPerYear).toBe(2);
      expect(config.minCoursesCompleted).toBe(5);
      expect(config.minSessions).toBe(10);
    });
  });

  describe('Platform Support', () => {
    it('should check if review is supported', async () => {
      const isSupported = await inAppReviewService.isSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });
});
