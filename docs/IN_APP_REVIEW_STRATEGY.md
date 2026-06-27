# In-App Review Strategy

## Overview
Smart in-app review system that requests App Store/Play Store reviews at optimal moments to maximize positive ratings.

## Implementation

### Quick Start
```typescript
import { useInAppReview, useReviewMetrics } from '@/hooks/useInAppReview';
import { ReviewTrigger } from '@/services/inAppReview';

// In your component
const { requestReview } = useInAppReview();
const { trackCourseComplete } = useReviewMetrics();

// After positive experience
const handleCourseComplete = async () => {
  trackCourseComplete();
  await requestReview(ReviewTrigger.COURSE_MILESTONE);
};
```

## Optimal Trigger Points

1. **First Course Completed** - User experienced value
2. **Course Milestone** (3+ courses) - Engaged user
3. **Perfect Quiz Score** - Positive achievement
4. **Achievement Unlocked** - Gamification success
5. **Learning Streak** (7+ days) - Habit formed
6. **Social Engagement** - User sharing content

## Eligibility Rules

- ✅ 7+ days since install
- ✅ 90+ days since last request
- ✅ Max 3 requests per year
- ✅ 2+ courses completed
- ✅ 5+ app sessions
- ✅ Respects "Don't ask again"

## Integration Points

### 1. Course Completion
```typescript
// In course completion handler
import { useInAppReview, useReviewMetrics } from '@/hooks/useInAppReview';

const { requestReview } = useInAppReview();
const { trackCourseComplete } = useReviewMetrics();

const onCourseComplete = async () => {
  trackCourseComplete();
  const coursesCompleted = useReviewStore.getState().coursesCompleted;
  
  if (coursesCompleted === 1) {
    await requestReview(ReviewTrigger.FIRST_COURSE_COMPLETED);
  } else if (coursesCompleted % 3 === 0) {
    await requestReview(ReviewTrigger.COURSE_MILESTONE);
  }
};
```

### 2. Quiz Perfect Score
```typescript
const { trackPerfectQuiz } = useReviewMetrics();

const onQuizComplete = async (score: number, total: number) => {
  if (score === total) {
    trackPerfectQuiz();
    await requestReview(ReviewTrigger.PERFECT_QUIZ_SCORE);
  }
};
```

### 3. Achievement Unlocked
```typescript
const { trackAchievement } = useReviewMetrics();

const onAchievementUnlock = async () => {
  trackAchievement();
  await requestReview(ReviewTrigger.ACHIEVEMENT_UNLOCKED);
};
```

### 4. Session Tracking
```typescript
// In App.tsx or root component
useEffect(() => {
  const { trackSession } = useReviewMetrics();
  trackSession();
}, []);
```

## Metrics Tracked

- Install date
- Review request history
- Courses completed
- App sessions
- Achievements unlocked
- Learning streak
- Perfect quiz scores

## Testing

```typescript
import { useReviewStore } from '@/store/reviewStore';

// Reset metrics for testing
const { resetReviewMetrics } = useReviewStore();
resetReviewMetrics();

// Simulate metrics
const store = useReviewStore.getState();
store.incrementCoursesCompleted();
store.incrementSessionCount();
```

## Analytics

All review requests are tracked:
- `review_requested` event
- Trigger type
- Shown/not shown
- Eligibility reason
- User metrics snapshot

## Platform Support

- ✅ iOS 10.3+
- ✅ Android 5.0+ (API 21+)
- ❌ Web (fallback to store URL)

## Best Practices

1. **Never force** - Let the system decide eligibility
2. **Positive moments only** - After achievements, not errors
3. **Respect limits** - Don't spam users
4. **Track metrics** - Monitor request success rate
5. **Test thoroughly** - Use TestFlight/Internal Testing

## Configuration

```typescript
import { inAppReviewService } from '@/services/inAppReview';

inAppReviewService.setConfig({
  minDaysSinceInstall: 7,
  minDaysSinceLastRequest: 90,
  maxRequestsPerYear: 3,
  minCoursesCompleted: 2,
  minSessions: 5,
});
```
