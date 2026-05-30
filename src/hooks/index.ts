export * from './useAdaptiveFrameRate';
export * from './useAdaptiveTheme';
export * from './useAnalytics';
export { AuthProvider, useAuth } from './useAuth';
export * from './useBiometricAuth';
export * from './useCamera';
export * from './useCourseProgress';
export * from './useDynamicFontSize';
export * from './useFormCache';
export * from './useFormValidation';
export * from './useGestures';
export * from './useHapticFeedback';
export * from './useInAppPurchase';
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
export * from './useSwipe';
export * from './useVideoGestures';
export * from './useVoiceRecognition';

// Optimized gesture handlers (named exports avoid duplicate SwipeDirection/SwipeInfo types)
export { OptimizedLongPressView, useOptimizedLongPress } from './useOptimizedLongPress';
export { OptimizedPinchZoomView, useOptimizedPinchZoom } from './useOptimizedPinchZoom';
export { OptimizedSwipeView, useOptimizedSwipe } from './useOptimizedSwipe';
export { OptimizedVideoGesturesView, useOptimizedVideoGestures } from './useOptimizedVideoGestures';

export * from './useDebounce';
export * from './useHealthDashboard';
export * from './usePredictivePreload';

