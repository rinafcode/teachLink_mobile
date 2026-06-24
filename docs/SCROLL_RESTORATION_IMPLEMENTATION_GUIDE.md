# Implementing Scroll Position Restoration

This guide provides examples for adding scroll restoration to various screen types in the TeachLink app.

## Quick Start

### 1. ScrollView-based Screen

```tsx
import { useRef } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export const CourseListScreen = () => {
  const scrollRef = useRef<ScrollView>(null);
  const { onScroll } = useScrollRestoration(scrollRef, {
    screenId: 'courses', // Must be unique per screen
  });

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* Your content */}
    </ScrollView>
  );
};
```

### 2. FlatList-based Screen

```tsx
import { useRef } from 'react';
import { FlatList } from 'react-native';
import { useFlatListScrollRestoration } from '@/hooks/useFlatListScrollRestoration';

export const SearchScreen = () => {
  const flatListRef = useRef<FlatList>(null);
  const { onScroll, onScrollToIndexFailed } = useFlatListScrollRestoration(
    flatListRef,
    {
      screenId: 'search',
    }
  );

  return (
    <FlatList
      ref={flatListRef}
      data={searchResults}
      onScroll={onScroll}
      onScrollToIndexFailed={onScrollToIndexFailed}
      scrollEventThrottle={16}
      renderItem={({ item }) => <SearchResultItem item={item} />}
      keyExtractor={(item) => item.id}
    />
  );
};
```

### 3. SectionList-based Screen (same as FlatList hook)

```tsx
import { useRef } from 'react';
import { SectionList } from 'react-native';
import { useFlatListScrollRestoration } from '@/hooks/useFlatListScrollRestoration';

export const CategoriesScreen = () => {
  const sectionListRef = useRef<SectionList>(null);
  const { onScroll } = useFlatListScrollRestoration(sectionListRef, {
    screenId: 'categories',
  });

  return (
    <SectionList
      ref={sectionListRef}
      sections={categorySections}
      onScroll={onScroll}
      scrollEventThrottle={16}
      renderItem={({ item }) => <CategoryItem item={item} />}
      renderSectionHeader={({ section: { title } }) => <SectionHeader title={title} />}
    />
  );
};
```

## Common Patterns

### Pattern 1: Handling Dynamic Data

When your list data changes, you want to clear the old scroll position to prevent restoring to an invalid index:

```tsx
import { useEffect, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { useFlatListScrollRestoration } from '@/hooks/useFlatListScrollRestoration';

export const ProfileCoursesScreen = ({ userId }: { userId: string }) => {
  const [courses, setCourses] = useState([]);
  const flatListRef = useRef<FlatList>(null);
  
  const { onScroll, onScrollToIndexFailed } = useFlatListScrollRestoration(
    flatListRef,
    {
      screenId: `profile-courses-${userId}`,
      clearOnDataChange: true, // Auto-clears when data changes
    }
  );

  useEffect(() => {
    fetchUserCourses(userId).then(setCourses);
  }, [userId]);

  return (
    <FlatList
      ref={flatListRef}
      data={courses}
      onScroll={onScroll}
      onScrollToIndexFailed={onScrollToIndexFailed}
      scrollEventThrottle={16}
      renderItem={({ item }) => <CourseCard course={item} />}
    />
  );
};
```

### Pattern 2: Multiple Scrollable Sections on One Screen

When you have multiple ScrollView or FlatList components on the same screen:

```tsx
export const ComplexScreen = () => {
  const topListRef = useRef<FlatList>(null);
  const bottomScrollRef = useRef<ScrollView>(null);

  // Use different screenId for each section
  const { onScroll: onTopScroll } = useFlatListScrollRestoration(topListRef, {
    screenId: 'complex-screen-top-list',
  });

  const { onScroll: onBottomScroll } = useScrollRestoration(bottomScrollRef, {
    screenId: 'complex-screen-bottom-scroll',
  });

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ref={topListRef}
        data={topData}
        onScroll={onTopScroll}
        scrollEventThrottle={16}
        renderItem={/* ... */}
      />
      
      <ScrollView
        ref={bottomScrollRef}
        onScroll={onBottomScroll}
        scrollEventThrottle={16}
      >
        {/* ... */}
      </ScrollView>
    </View>
  );
};
```

### Pattern 3: With Animated Headers

For screens with animated headers that hide/show on scroll:

```tsx
import { Animated } from 'react-native';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export const CourseViewerScreen = () => {
  const scrollRef = useRef<ScrollView>(null);
  const animatedHeaderOpacity = new Animated.Value(1);

  const { onScroll } = useScrollRestoration(scrollRef, {
    screenId: 'course-viewer',
    animatedValue: animatedHeaderOpacity,
  });

  const headerOpacity = animatedHeaderOpacity.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0.5],
  });

  return (
    <>
      <Animated.View style={{ opacity: headerOpacity }}>
        <Header />
      </Animated.View>
      
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Content */}
      </ScrollView>
    </>
  );
};
```

### Pattern 4: With Pull-to-Refresh

Combining scroll restoration with refresh control:

```tsx
import { useState, useRef } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useFlatListScrollRestoration } from '@/hooks/useFlatListScrollRestoration';

export const RefreshableListScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Course[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const { onScroll, onScrollToIndexFailed } = useFlatListScrollRestoration(
    flatListRef,
    { screenId: 'refreshable-courses' }
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const newData = await fetchCourses();
      setData(newData);
      // Scroll position will be automatically cleared due to data change
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <FlatList
      ref={flatListRef}
      data={data}
      onScroll={onScroll}
      onScrollToIndexFailed={onScrollToIndexFailed}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      renderItem={({ item }) => <CourseCard course={item} />}
    />
  );
};
```

### Pattern 5: Virtualized List (VirtualizedList)

```tsx
import { useRef } from 'react';
import { VirtualizedList } from 'react-native';
import { useFlatListScrollRestoration } from '@/hooks/useFlatListScrollRestoration';

export const VirtualListScreen = () => {
  const virtualListRef = useRef<VirtualizedList>(null);
  
  const { onScroll } = useFlatListScrollRestoration(virtualListRef, {
    screenId: 'virtual-courses',
    saveDelay: 300, // More frequent saves for smooth scrolling
  });

  return (
    <VirtualizedList
      ref={virtualListRef}
      data={largeDataset}
      initialNumToRender={10}
      renderItem={({ item }) => <Item item={item} />}
      keyExtractor={(item) => item.id}
      getItemCount={(data) => data.length}
      getItem={(data, index) => data[index]}
      onScroll={onScroll}
      scrollEventThrottle={16}
    />
  );
};
```

## Cleanup Patterns

### Clear position manually when needed

```tsx
import { scrollPositionService } from '@/services/scrollPositionService';

export const CategoriesScreen = () => {
  const handleDeleteCategory = async (categoryId: string) => {
    await deleteCategory(categoryId);
    // List structure changed, clear saved position
    await scrollPositionService.clearPosition('categories');
    // Refresh list...
  };

  // ...
};
```

### Clear all positions (for testing or user data reset)

```tsx
import { scrollPositionService } from '@/services/scrollPositionService';

export const SettingsScreen = () => {
  const handleClearCache = async () => {
    // Also clears all scroll positions
    await scrollPositionService.clearAll();
    // Clear other caches...
  };

  // ...
};
```

## Performance Tuning

### For high-frequency scroll updates

```tsx
// Increase debounce and threshold to reduce storage writes
useScrollRestoration(scrollRef, {
  screenId: 'heavy-content',
  saveDelay: 1000,        // Save after 1 second of inactivity
  minDistanceThreshold: 100, // Only save for significant scrolls
})
```

### For snappy, frequent scrolls

```tsx
// Decrease delays for more responsive position tracking
useFlatListScrollRestoration(flatListRef, {
  screenId: 'quick-scroll',
  saveDelay: 250,         // Save more often
  minDistanceThreshold: 20, // Track small scrolls
})
```

## Testing

### Unit test example

```tsx
import { renderHook } from '@testing-library/react-native';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

describe('useScrollRestoration', () => {
  it('should handle scroll events', () => {
    const ref = { current: null };
    const { result } = renderHook(() => 
      useScrollRestoration(ref, { screenId: 'test' })
    );

    // Simulate scroll
    result.current.onScroll({
      nativeEvent: { contentOffset: { y: 100 } },
    });

    // Assert position was saved
  });
});
```

## Troubleshooting

### Issue: Position not restoring

**Check:**
1. Screen ID is unique and consistent
2. `onScroll` handler is attached to ScrollView
3. `scrollEventThrottle={16}` is set
4. AsyncStorage is not full
5. Position is less than 24 hours old

### Issue: Performance degradation

**Solutions:**
1. Increase `saveDelay` (default 500ms)
2. Increase `minDistanceThreshold` (default 50px)
3. For FlatList, ensure `clearOnDataChange` is not causing unnecessary clears
4. Check AsyncStorage size isn't exceeding device limits

### Issue: Position becomes invalid after data updates

**This is expected behavior.** For FlatList:
- `clearOnDataChange: true` (default) automatically clears
- This prevents restore-to-wrong-index bugs
- Disable only if list items have stable IDs

## Migration Checklist

- [ ] Replace `useScrollToTop` with `useScrollRestoration`
- [ ] Add `onScroll={onScroll}` to ScrollView/FlatList
- [ ] Add `scrollEventThrottle={16}` for performance
- [ ] Set unique `screenId` for each scrollable screen
- [ ] Test navigation back and forth
- [ ] Test with long lists to ensure positions restore correctly
- [ ] Test with data changes to verify invalid positions are cleared
- [ ] Update snapshots if using visual regression testing
