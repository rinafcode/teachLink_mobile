Here is the complete resolved file. It keeps the exports from both your feature branch (`inAppReview`) and the main branch (`clipboardService`). 

Copy and paste this exact code:

```typescript
export * from './abTesting';
export * from './performanceExperiments';
export * from './pushNotifications';
export * from './batchDataProcessor';
export * from './clipboardService';
export {
  inAppReviewService,
  ReviewTrigger,
  type ReviewConfig,
  type ReviewRequestResult,
} from './inAppReview';
```