import { useReviewStore } from '../../store/reviewStore';
import { ReviewTrigger } from '../../services/inAppReview';

describe('ReviewStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useReviewStore.getState();
    store.resetReviewMetrics();
  });

  describe('Metrics Tracking', () => {
    it('should increment courses completed', () => {
      const store = useReviewStore.getState();
      
      expect(store.coursesCompleted).toBe(0);
      
      store.incrementCoursesCompleted();
      expect(store.coursesCompleted).toBe(1);
      
      store.incrementCoursesCompleted();
      expect(store.coursesCompleted).toBe(2);
    });

    it('should increment session count', () => {
      const store = useReviewStore.getState();
      
      expect(store.sessionCount).toBe(0);
      
      store.incrementSessionCount();
      expect(store.sessionCount).toBe(1);
      
      store.incrementSessionCount();
      expect(store.sessionCount).toBe(2);
    });

    it('should increment achievements unlocked', () => {
      const store = useReviewStore.getState();
      
      expect(store.achievementsUnlocked).toBe(0);
      
      store.incrementAchievementsUnlocked();
      expect(store.achievementsUnlocked).toBe(1);
    });

    it('should set learning streak', () => {
      const store = useReviewStore.getState();
      
      expect(store.learningStreak).toBe(0);
      
      store.setLearningStreak(7);
      expect(store.learningStreak).toBe(7);
    });

    it('should increment perfect quiz scores', () => {
      const store = useReviewStore.getState();
      
      expect(store.perfectQuizScores).toBe(0);
      
      store.incrementPerfectQuizScores();
      expect(store.perfectQuizScores).toBe(1);
    });
  });

  describe('Review Request Recording', () => {
    it('should record review request', () => {
      const store = useReviewStore.getState();
      
      expect(store.reviewRequestCount).toBe(0);
      expect(store.requestHistory).toHaveLength(0);
      
      store.recordReviewRequest(ReviewTrigger.COURSE_MILESTONE, true, 'Success');
      
      expect(store.reviewRequestCount).toBe(1);
      expect(store.requestHistory).toHaveLength(1);
      expect(store.requestHistory[0].trigger).toBe(ReviewTrigger.COURSE_MILESTONE);
      expect(store.requestHistory[0].shown).toBe(true);
      expect(store.requestHistory[0].reason).toBe('Success');
    });

    it('should update last review request date', () => {
      const store = useReviewStore.getState();
      const beforeTime = Date.now();
      
      store.recordReviewRequest(ReviewTrigger.COURSE_MILESTONE, true, 'Success');
      
      const afterTime = Date.now();
      expect(store.lastReviewRequestDate).toBeGreaterThanOrEqual(beforeTime);
      expect(store.lastReviewRequestDate).toBeLessThanOrEqual(afterTime);
    });

    it('should reset yearly counter on new year', () => {
      const store = useReviewStore.getState();
      
      // Record request in current year
      store.recordReviewRequest(ReviewTrigger.COURSE_MILESTONE, true, 'Success');
      expect(store.reviewRequestsThisYear).toBe(1);
      
      // Simulate new year by manually setting lastRequestYear to previous year
      const currentYear = new Date().getFullYear();
      useReviewStore.setState({ lastRequestYear: currentYear - 1 });
      
      // Record another request
      store.recordReviewRequest(ReviewTrigger.PERFECT_QUIZ_SCORE, true, 'Success');
      
      // Should reset to 1 for new year
      expect(useReviewStore.getState().reviewRequestsThisYear).toBe(1);
    });

    it('should limit request history to 20 entries', () => {
      const store = useReviewStore.getState();
      
      // Add 25 requests
      for (let i = 0; i < 25; i++) {
        store.recordReviewRequest(ReviewTrigger.COURSE_MILESTONE, true, `Request ${i}`);
      }
      
      // Should only keep last 20
      expect(store.requestHistory).toHaveLength(20);
      expect(store.requestHistory[0].reason).toBe('Request 5'); // First 5 dropped
      expect(store.requestHistory[19].reason).toBe('Request 24');
    });
  });

  describe('User Preferences', () => {
    it('should set doNotAskAgain preference', () => {
      const store = useReviewStore.getState();
      
      expect(store.doNotAskAgain).toBe(false);
      
      store.setDoNotAskAgain(true);
      expect(store.doNotAskAgain).toBe(true);
      
      store.setDoNotAskAgain(false);
      expect(store.doNotAskAgain).toBe(false);
    });
  });

  describe('Metrics Getter', () => {
    it('should return correct metrics object', () => {
      const store = useReviewStore.getState();
      
      // Set up some data
      store.incrementCoursesCompleted();
      store.incrementCoursesCompleted();
      store.incrementSessionCount();
      store.incrementSessionCount();
      store.incrementSessionCount();
      store.recordReviewRequest(ReviewTrigger.COURSE_MILESTONE, true, 'Success');
      
      const metrics = store.getMetrics();
      
      expect(metrics.coursesCompleted).toBe(2);
      expect(metrics.sessionCount).toBe(3);
      expect(metrics.reviewRequestCount).toBe(1);
      expect(metrics.doNotAskAgain).toBe(false);
      expect(metrics.installDate).toBeDefined();
      expect(metrics.lastReviewRequestDate).toBeDefined();
    });
  });

  describe('Reset', () => {
    it('should reset all review metrics', () => {
      const store = useReviewStore.getState();
      
      // Set up some data
      store.incrementCoursesCompleted();
      store.incrementSessionCount();
      store.recordReviewRequest(ReviewTrigger.COURSE_MILESTONE, true, 'Success');
      store.setDoNotAskAgain(true);
      
      // Verify data exists
      expect(store.coursesCompleted).toBe(1);
      expect(store.reviewRequestCount).toBe(1);
      expect(store.doNotAskAgain).toBe(true);
      
      // Reset
      store.resetReviewMetrics();
      
      // Verify reset
      expect(store.lastReviewRequestDate).toBeNull();
      expect(store.reviewRequestCount).toBe(0);
      expect(store.reviewRequestsThisYear).toBe(0);
      expect(store.lastRequestYear).toBeNull();
      expect(store.doNotAskAgain).toBe(false);
      expect(store.requestHistory).toHaveLength(0);
    });
  });
});
