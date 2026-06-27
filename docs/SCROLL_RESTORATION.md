# Scroll Position Restoration

## Overview

This feature automatically restores scroll positions when returning to previously-visited screens. Instead of scrolling to the top, users see the screen exactly where they left it, significantly improving the perceived performance and user experience.

## Architecture

### Components

1. **scrollPositionService** (`src/services/scrollPositionService.ts`)
   - Central service for persisting and retrieving scroll positions
   - Stores positions in AsyncStorage with timestamps
   - Automatically clears outdated positions (> 24 hours old)
   - Handles list updates by detecting content changes

2. **useScrollRestoration** (`hooks/useScrollRestoration.ts`)
   - Hook for ScrollView-based screens
   - Manages automatic saving and restoration of scroll positions
   - Supports debouncing and threshold-based saving
   - Works with Animated values for UI effects

3. **useFlatListScrollRestoration** (`hooks/useFlatListScrollRestoration.ts`)
   - Hook for FlatList/SectionList-based screens
   - Detects content changes and invalidates stale positions
   - Handles fast scrolling smoothly
   - Prevents restore failures when list structure changes

## How It Works

### Flow Diagram

```
User navigates to Screen A
    ↓
useScrollRestoration saves scroll position on blur
    ↓
User navigates away (to Screen B)
    ↓
Position stored in AsyncStorage with timestamp
    ↓
User navigates back to Screen A
    ↓
Screen A regains focus (useFocusEffect)
    ↓
Check if saved position exists and is valid
    ↓
YES: Restore scroll position instantly
NO: Scroll to top (first load)
```

### Position Invalidation

Positions are automatically cleared in these scenarios:

1. **Age-based**: Positions older than 24 hours are considered stale
2. **Content changes**: For FlatList, if content size/structure changes, position is cleared
3. **Manual clearing**: When `clearPosition()` is called explicitly
4. **User data reset**: When `clearAll()` is called

## Usage

### ScrollView Implementation

```tsx
import { useRef } from 'react';
import { ScrollView } from 'react-native';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export const CourseListScreen = () => {
  const scrollRef = useRef<ScrollView>(null);
  const { onScroll } = useScrollRestoration(scrollRef, {
    screenId: 'course-list',
    saveDelay: 500,
    minDistanceThreshold: 50,
  });

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* Content */}
    </ScrollView>
  );
};
```

### FlatList Implementation

```tsx
import { useRef } from 'react';
import { FlatList } from 'react-native';
import { useFlatListScrollRestoration } from '@/hooks/useFlatListScrollRestoration';

export const CoursesScreen = () => {
  const flatListRef = useRef<FlatList>(null);
  const { onScroll, onScrollToIndexFailed } = useFlatListScrollRestoration(
    flatListRef,
    {
      screenId: 'courses',
      clearOnDataChange: true, // Clear if data changes
    }
  );

  return (
    <FlatList
      ref={flatListRef}
      data={courses}
      onScroll={onScroll}
      onScrollToIndexFailed={onScrollToIndexFailed}
      scrollEventThrottle={16}
      renderItem={/* ... */}
    />
  );
};
```

### With Animated Values

For animated headers, parallax effects, or other UI animations:

```tsx
import { Animated } from 'react-native';

export const Screen = () => {
  const animatedValue = new Animated.Value(0);
  const scrollRef = useRef<ScrollView>(null);
  
  const { onScroll } = useScrollRestoration(scrollRef, {
    screenId: 'screen-with-animation',
    animatedValue, // Animation synced with scroll position
    onChange: (offset) => {
      // Custom handlers can track position changes
      console.log('Current scroll:', offset);
    },
  });

  const headerOpacity = animatedValue.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0],
  });

  return (
    <>
      <Animated.View style={{ opacity: headerOpacity }}>
        {/* Animated header */}
      </Animated.View>
      <ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16}>
        {/* Content */}
      </ScrollView>
    </>
  );
};
```

## API Reference

### useScrollRestoration Options

```typescript
interface UseScrollRestorationOptions {
  // Unique identifier for the screen (default: current pathname)
  screenId?: string;

  // Debounce delay for saving (default: 500ms)
  saveDelay?: number;

  // Minimum scroll distance before saving (default: 50px)
  minDistanceThreshold?: number;

  // Scroll to top on first load (default: true)
  scrollToTopOnFirstLoad?: boolean;

  // Called when position is restored
  onRestored?: (offset: number) => void;

  // Called when scroll position changes
  onChange?: (offset: number) => void;

  // Animated value synced with scroll position
  animatedValue?: Animated.Value;
}
```

### useFlatListScrollRestoration Options

```typescript
interface UseFlatListScrollRestorationOptions {
  // Unique identifier (default: current pathname)
  screenId?: string;

  // Debounce delay for saving (default: 500ms)
  saveDelay?: number;

  // Minimum scroll distance before saving (default: 50px)
  minDistanceThreshold?: number;

  // Clear position when list data changes (default: true)
  clearOnDataChange?: boolean;

  // Called when position is restored
  onRestored?: (offset: number) => void;

  // Called when scroll position changes
  onChange?: (offset: number) => void;

  // Animated value synced with scroll position
  animatedValue?: Animated.Value;
}
```

### scrollPositionService Methods

```typescript
// Save scroll position for a route
savePosition(route: string, offset: number): Promise<void>

// Get saved position if valid
getPosition(route: string): Promise<ScrollPositionData | null>

// Clear position for a route
clearPosition(route: string): Promise<void>

// Clear all positions older than 24 hours
clearOldPositions(): Promise<void>

// Clear all positions (use sparingly)
clearAll(): Promise<void>
```

## Performance Considerations

### Memory Usage

- Uses AsyncStorage for persistence (shared with app config)
- Positions cached in-memory during app session
- Automatic cleanup of positions older than 24 hours
- Each position: ~100 bytes (offset + timestamp)

### Scroll Performance

- Debounced saves reduce storage I/O (default 500ms)
- Minimum distance threshold prevents excessive saves (default 50px)
- ScrollView restoration is instant (no animation)
- Works smoothly with 60fps scrolling (throttle: 16ms)

### Best Practices

1. **Use appropriate screen IDs**: Should be unique and consistent
   ```tsx
   // Good: Explicit, unique
   useScrollRestoration(ref, { screenId: 'home-feed' })
   
   // Okay: Uses pathname automatically
   useScrollRestoration(ref)
   ```

2. **Set clearOnDataChange for dynamic lists**:
   ```tsx
   // For lists that can add/remove items
   useFlatListScrollRestoration(ref, { clearOnDataChange: true })
   
   // For static lists
   useFlatListScrollRestoration(ref, { clearOnDataChange: false })
   ```

3. **Adjust debounce for your use case**:
   ```tsx
   // For heavy content screens: larger delay
   useScrollRestoration(ref, { saveDelay: 1000 })
   
   // For fast scrolling: smaller delay
   useScrollRestoration(ref, { saveDelay: 250 })
   ```

## Testing

### Unit Tests

```tsx
import { scrollPositionService } from '@/services/scrollPositionService';

describe('scrollPositionService', () => {
  afterEach(async () => {
    await scrollPositionService.clearAll();
  });

  it('should save and retrieve position', async () => {
    await scrollPositionService.savePosition('home', 100);
    const result = await scrollPositionService.getPosition('home');
    expect(result?.offset).toBe(100);
  });

  it('should clear expired positions', async () => {
    // Save position with old timestamp
    const oldData = {
      offset: 100,
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    };
    // Would need to mock AsyncStorage for this test
  });
});
```

### Integration Tests

```tsx
import { render } from '@testing-library/react-native';
import { HomeScreenContent } from '@/screens/HomeScreenContent';

describe('HomeScreenContent scroll restoration', () => {
  it('should restore scroll position on return', async () => {
    const { getByTestId } = render(<HomeScreenContent />);
    // Simulate scroll
    // Navigate away
    // Navigate back
    // Assert position restored
  });
});
```

## Migration Guide

### From useScrollToTop

**Before:**
```tsx
const scrollRef = useRef<ScrollView>(null);
useScrollToTop(scrollRef); // Always scrolls to top on focus

<ScrollView ref={scrollRef} />
```

**After:**
```tsx
const scrollRef = useRef<ScrollView>(null);
const { onScroll } = useScrollRestoration(scrollRef);

<ScrollView 
  ref={scrollRef} 
  onScroll={onScroll}
  scrollEventThrottle={16}
/>
```

### Troubleshooting

#### Position not restoring

1. Check screen ID is consistent between saves
2. Verify AsyncStorage is accessible
3. Check if position is older than 24 hours
4. For FlatList: ensure clearOnDataChange isn't clearing unexpectedly

#### Performance issues

1. Increase saveDelay (reduce storage writes)
2. Increase minDistanceThreshold (reduce scroll calculations)
3. Check device storage isn't full
4. Monitor AsyncStorage size with `getAllKeys()`

#### Position becomes invalid after list updates

This is expected and correct. For FlatList:
- Enable `clearOnDataChange: true` (default)
- Positions automatically clear when list structure changes
- Prevents scroll to wrong items

## Future Enhancements

- [ ] Scroll position sync across tabs
- [ ] Animated restoration (optional smooth scroll)
- [ ] Per-item index restoration for FlatList
- [ ] Scroll position history (go to specific point)
- [ ] Export/import positions for analytics
