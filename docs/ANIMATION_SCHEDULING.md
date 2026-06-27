# Animation Scheduling Best Practices

## Overview

This document outlines the best practices for animation scheduling in the teachLink_mobile project, focusing on using `requestAnimationFrame` for smooth, frame-synced animations at 60fps.

## Why requestAnimationFrame?

Using `requestAnimationFrame` (rAF) instead of `setTimeout`/`setInterval` for animations provides several benefits:

- **Frame Synchronization**: rAF syncs with the browser's refresh rate, ensuring animations run at 60fps on capable devices
- **Battery Efficiency**: rAF pauses when the tab is inactive, saving battery
- **Smooth Animations**: Avoids jank caused by setTimeout's imprecise timing
- **Better Performance**: Browsers can optimize rAF callbacks more effectively

## Animation Scheduler Utility

The project includes a comprehensive animation scheduler utility at `src/utils/animationScheduler.ts` that provides:

### Core Classes and Functions

#### `AnimationScheduler`
A class for managing complex animations with frame-synced timing.

```typescript
const scheduler = new AnimationScheduler();
scheduler.schedule((timestamp) => {
  // Animation logic
  return true; // Return false to stop
}, 1000); // Optional duration in ms
```

#### `scheduleAnimationFrame`
A drop-in replacement for setTimeout that uses rAF for execution.

```typescript
const cancel = scheduleAnimationFrame(() => {
  // Your code
}, 1000); // Optional delay

// Cancel if needed
cancel();
```

#### `debounceAnimationFrame`
Debounce function that ensures callbacks run on the next animation frame.

```typescript
const debouncedFn = debounceAnimationFrame((value) => {
  // Handle value
}, 100);
```

#### `throttleAnimationFrame`
Throttle function that ensures callbacks run at most once per animation frame.

```typescript
const throttledFn = throttleAnimationFrame((event) => {
  // Handle event
});
```

## When to Use requestAnimationFrame

### Use rAF for:
- Visual animations (transitions, transforms, opacity changes)
- Gesture timing (long press, double tap detection)
- UI feedback animations (toasts, loading states)
- Scroll-related animations
- Any animation that needs to run smoothly at 60fps

### Use setTimeout for:
- Network request timeouts
- Debouncing API calls
- Non-animation timing requirements
- Operations that don't need frame synchronization

## Implementation Examples

### Gesture Timing (Long Press)

```typescript
// Before: Using setTimeout
timerRef.current = setTimeout(() => {
  onLongPress({ pageX, pageY });
}, durationMs);

// After: Using requestAnimationFrame
startTimeRef.current = performance.now();
const checkDuration = (timestamp: number) => {
  const elapsed = timestamp - startTimeRef.current;
  if (elapsed >= durationMs) {
    onLongPress({ pageX, pageY });
  } else {
    rafRef.current = requestAnimationFrame(checkDuration);
  }
};
rafRef.current = requestAnimationFrame(checkDuration);
```

### Toast Dismissal

```typescript
// Before: Using setTimeout
setTimeout(() => {
  removeToast(id);
}, toastDuration);

// After: Using scheduleAnimationFrame
const cancelSchedule = scheduleAnimationFrame(() => {
  removeToast(id);
}, toastDuration);
```

### Video Player Auto-Hide

```typescript
// Before: Using setTimeout
hideTimerRef.current = setTimeout(() => {
  setControlsVisible(false);
}, AUTO_HIDE_MS);

// After: Using scheduleAnimationFrame
hideTimerRef.current = scheduleAnimationFrame(() => {
  setControlsVisible(false);
}, AUTO_HIDE_MS);
```

## React Native Animated API

For React Native animations, prefer using the built-in `Animated` API or `react-native-reanimated`:

```typescript
// These are already optimized and use native drivers
Animated.timing(value, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true,
}).start();

// react-native-reanimated (runs on UI thread)
withSpring(translateX.value, SPRING_CONFIG);
withTiming(translateY.value, { duration: 200 });
```

## Performance Considerations

### Adaptive Frame Rate

The project includes `useAdaptiveFrameRate` hook to adjust animations based on device capabilities:

```typescript
const { durationMultiplier } = useAdaptiveFrameRate();

// Use multiplier for animation durations
Animated.timing(value, {
  duration: 300 * durationMultiplier, // Scales based on device
  useNativeDriver: true,
}).start();
```

### Cleanup

Always clean up animation callbacks to prevent memory leaks:

```typescript
useEffect(() => {
  const scheduler = new AnimationScheduler();
  scheduler.schedule(callback, duration);
  
  return () => {
    scheduler.dispose(); // Clean up
  };
}, []);
```

## Testing Animation Performance

To verify 60fps performance:

1. Use React Native's `PerformanceOverlay` to monitor FPS
2. Test on low-end devices to ensure smooth performance
3. Use the `useAdaptiveFrameRate` hook for device-aware animations
4. Profile animations using React DevTools or Flipper

## Migration Checklist

When migrating from setTimeout to requestAnimationFrame:

- [ ] Identify all setTimeout calls used for animations
- [ ] Replace with scheduleAnimationFrame or direct rAF usage
- [ ] Ensure proper cleanup of rAF callbacks
- [ ] Test animations on different devices
- [ ] Verify 60fps performance
- [ ] Update documentation

## Common Pitfalls

1. **Forgetting to cancel rAF callbacks**: Always cancel on unmount
2. **Using rAF for non-animation timing**: Use setTimeout for network timeouts
3. **Not using native drivers**: Always use `useNativeDriver: true` when possible
4. **Ignoring device capabilities**: Use adaptive frame rate for low-end devices

## References

- [MDN: Window.requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)
- [React Native: Animated API](https://reactnative.dev/docs/animations)
- [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/)
