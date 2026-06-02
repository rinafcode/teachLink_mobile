# Cache Warming Strategy

## Background

On app start, the user historically had to wait for critical data (user profile, initial courses) to load, resulting in a blank or loading screen. To dramatically reduce the time-to-first-paint and improve the cold start experience, we implemented a cache warming strategy.

## Implementation Details

1. **Splash Screen Interception:**
   We use `SplashScreen.preventAutoHideAsync()` in `App.tsx` to keep the splash screen visible while critical data and initialization steps are executed.

2. **Parallel Fetching:**
   During the app startup sequence (`prepareApp` in `App.tsx`), we fetch the critical resources in parallel.
   - User Profile (if authenticated)
   - Initial Courses (Home Feed)
   These fetches are managed by `warmCriticalCaches()` located in `src/services/cacheWarming.ts`.

3. **Background Prefetching and Fallbacks:**
   - The fetch logic uses existing cache layers (e.g., `fetchWithSWR`).
   - If a request fails or times out, the cache warming catches the error silently (swallowed errors) to prevent blocking the app startup. The UI will render with cached/stale data or a loading state if needed.

4. **Dismissing the Splash Screen:**
   Once `warmCriticalCaches()` and other critical initializations resolve, `SplashScreen.hideAsync()` is invoked. By this point, the initial home screen components have access to the cached data directly, resulting in an immediate render with no spinners.

## Performance Monitoring

Cold start times are tracked using the `mobileAnalyticsService` globally. At the beginning of `App.tsx`, we log the `appStartTime` and record the duration until the splash screen is dismissed:
```typescript
const coldStartDuration = Date.now() - appStartTime;
mobileAnalyticsService.trackEvent(AnalyticsEvent.PERFORMANCE_METRIC, {
  metric_name: PerformanceMetric.APP_LOAD_TIME,
  metric_value: coldStartDuration,
  launch_type: 'cold',
});
```
This is essential for identifying regressions and ensuring the app consistently meets the 50%+ reduction goal for cold start times.

## Success Criteria Addressed

- **Identified critical data:** User profile and courses.
- **Cache warming in splash screen:** Preloads via `warmCriticalCaches()`.
- **Fetch before hideAsync:** Yes, `await warmCriticalCaches()` precedes `SplashScreen.hideAsync()`.
- **Monitor metrics:** Implemented `PerformanceMetric.APP_LOAD_TIME` tracking via `mobileAnalyticsService`.
