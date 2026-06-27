# LayoutAnimation Optimization Guide

## Overview

This document describes the approved patterns and best practices for using LayoutAnimation in the teachLink_mobile application. It includes performance considerations, device capability detection, and when to prefer Animated/Reanimated APIs.

## Architecture

### Centralized Utility

All LayoutAnimation usage is centralized in `src/utils/layoutAnimation.ts`. This utility provides:

- **Device capability detection** using `expo-device`
- **Optimized animation presets** based on device class
- **Debouncing** to prevent layout thrashing
- **Single initialization** for Android platform support

### Initialization

LayoutAnimation is initialized once at app startup in `app/_layout.tsx`:

```typescript
import { initializeLayoutAnimation } from '../src/utils/layoutAnimation';

// Initialize LayoutAnimation for Android (single initialization at app startup)
initializeLayoutAnimation();
```

**Do not** add `UIManager.setLayoutAnimationEnabledExperimental(true)` in individual components.

## Approved Usage Patterns

### 1. Progressive Disclosure (Expand/Collapse)

Use LayoutAnimation for simple expand/collapse UI patterns:

```typescript
import { configureNext } from '../../utils/layoutAnimation';

const handleToggleAdvanced = () => {
  configureNext();
  setShowAdvancedSettings(prev => !prev);
};
```

**When to use:**
- Showing/hiding form sections
- Expanding/collapsing accordions
- Progressive disclosure UI patterns

**When NOT to use:**
- Animating large lists
- Complex gesture-based interactions
- High-frequency updates (e.g., video controls, scroll-based animations)

### 2. Device-Aware Animation Presets

The centralized utility automatically selects the optimal preset based on device capabilities:

- **High-end devices**: Spring animation (250ms)
- **Mid-range devices**: Ease-in-ease-out (300ms)
- **Low-end devices**: Minimal/fast animation (100-150ms) or disabled entirely

### 3. Debouncing

All `configureNext` calls are automatically debounced (100ms) to prevent layout thrashing from rapid successive state updates.

## When to Use Animated/Reanimated Instead

Prefer `react-native-reanimated` or `Animated` API for:

1. **Gesture-driven animations** (swipe, pinch, pan)
2. **Continuous animations** (loading spinners, progress bars)
3. **Complex choreography** (coordinated multi-element animations)
4. **Performance-critical animations** (60fps requirements on all devices)
5. **Scroll-based animations** (parallax, sticky headers)
6. **Video player controls** (seeking, playback rate changes)

The project already uses `react-native-reanimated` (~4.1.1) for gesture handling in:
- `SwipeableRow.tsx`
- `FilterSheet.tsx`
- `PullToRefresh.tsx`
- Video gesture hooks

## Performance Considerations

### Low-End Device Protection

The utility automatically detects low-end devices and:

- Reduces animation duration
- Uses linear easing (cheaper to compute)
- Disables animations on devices with <3GB RAM or manufactured before 2020

### Layout Thrashing Prevention

The debouncing mechanism prevents:
- Multiple rapid `configureNext` calls
- Consecutive state updates triggering animations
- Layout recalculation during large list updates

### Native Platform Behavior

**Android:**
- Experimental LayoutAnimation is enabled once at app startup
- No repeated initialization in components
- Uses `UIManager.setLayoutAnimationEnabledExperimental(true)` safely with try-catch

**iOS:**
- LayoutAnimation is enabled by default
- No special initialization required

## Migration Guide

### Before (Old Pattern)

```typescript
import { LayoutAnimation, Platform, UIManager } from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const handleToggle = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setShowAdvanced(prev => !prev);
};
```

### After (New Pattern)

```typescript
import { configureNext } from '../../utils/layoutAnimation';

const handleToggle = () => {
  configureNext();
  setShowAdvanced(prev => !prev);
};
```

## Files Modified

### Centralized Utility
- `src/utils/layoutAnimation.ts` - New file with device detection and optimized presets

### App Initialization
- `app/_layout.tsx` - Single LayoutAnimation initialization

### Component Refactoring
- `src/components/mobile/MobileProfile.tsx` - Uses centralized utility
- `src/components/mobile/MobileSettings.tsx` - Uses centralized utility
- `src/components/mobile/NotificationSettings.tsx` - Uses centralized utility
- `src/components/mobile/MobileSyllabus.tsx` - Removed redundant initialization (no actual usage)

## Performance Targets

- **Consistent 60fps** on high/mid-end devices
- **Reduced frame drops** on low-end devices
- **Minimized layout recalculations** through debouncing
- **Automatic adaptation** to device capabilities

## Debugging

To check device class and animation behavior:

```typescript
import { getDeviceClass, shouldEnableLayoutAnimation } from '../../utils/layoutAnimation';

console.log('Device class:', getDeviceClass());
console.log('LayoutAnimation enabled:', shouldEnableLayoutAnimation());
```

## Future Considerations

### Potential Enhancements

1. **Feature flags** for A/B testing animation strategies
2. **Performance monitoring** integration with existing analytics
3. **User preference** for reduced motion (accessibility)
4. **Frame rate monitoring** to dynamically adjust animation quality

### Monitoring

Consider integrating with existing performance utilities:
- `src/utils/performanceUtils.ts` - Performance measurement
- `src/utils/memoryProfiler.ts` - Memory monitoring
- Analytics provider for tracking animation performance

## References

- [React Native LayoutAnimation Docs](https://reactnative.dev/docs/layoutanimation)
- [expo-device API](https://docs.expo.dev/versions/latest/sdk/device/)
- [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/)
