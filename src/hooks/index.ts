export * from './useAdaptiveFrameRate';
export * from './useDeviceUiComplexity';
export * from './useAdaptiveTheme';
export * from './useAnalytics';
export { AuthProvider, useAuth } from './useAuth';
export * from './useBiometricAuth';
export * from './useCamera';
export * from './useCoursePagination';
export * from './useCourseProgress';
export * from './useDebounce';
export * from './useDynamicFontSize';
export * from './useFormCache';
export * from './useFormValidation';
export * from './useFeatureFlags';
export * from './useGestures';
export * from './useHapticFeedback';
export * from './useInAppPurchase';
export { useInAppReview, useReviewMetrics } from './useInAppReview';
export * from './useLongPress';
export * from './useMemoryMonitor';
export * from './useNetworkStatus';
export * from './useNotificationPermission';
export * from './useOfflineData';
export * from './usePendingRequests';
export * from './usePictureInPicture';
export * from './usePinchZoom';
export * from './usePrefetchImages';
export * from './useSafeArea';
export * from './useScreenReader';
export * from './useStreamingData';
export * from './useSwipe';
export * from './useVideoGestures';
export * from './useVoiceRecognition';
export * from './useFocusRestore';
export * from './useFocusTrap';
export * from './useHealthDashboard';
export * from './usePredictivePreload';
export * from './useOptimizedClipboard';
export * from './useReactProfiler';

// Scroll restoration hooks
export { useScrollRestoration } from '../../hooks/useScrollRestoration';
export { useFlatListScrollRestoration } from '../../hooks/useFlatListScrollRestoration';

// Optimized gesture handlers (named exports avoid duplicate SwipeDirection/SwipeInfo types)
export { OptimizedLongPressView, useOptimizedLongPress } from './useOptimizedLongPress';
export { OptimizedPinchZoomView, useOptimizedPinchZoom } from './useOptimizedPinchZoom';
export { OptimizedSwipeView, useOptimizedSwipe } from './useOptimizedSwipe';
export * from './useDashboardMetrics';
export { OptimizedVideoGesturesView, useOptimizedVideoGestures } from './useOptimizedVideoGestures';
export * from './useTouchDeduplication';
export { useSearchIndex } from './useSearchIndex';
export type { UseSearchIndexResult } from './useSearchIndex';

