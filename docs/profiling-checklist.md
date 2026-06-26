# Re-render Profiling Checklist

## Prerequisites
- [ ] React DevTools Profiler installed (Chrome extension or standalone)
- [ ] App running in development mode (`npx expo start`)
- [ ] Device/emulator connected for profiling

## Profiling Session

### 1. Baseline Capture
- [ ] Open React DevTools → Profiler tab
- [ ] Click "Record" before performing an action
- [ ] Navigate to each main screen (Home, Search, Profile, Settings)
- [ ] Perform core user flows (search, scroll list, open course, take quiz)
- [ ] Stop recording after covering all flows
- [ ] Export flamegraph as baseline

### 2. Identify Re-render Culprits
- [ ] Look for components highlighted in **blue** (unnecessary re-renders)
- [ ] Filter by commit that re-renders 10+ components
- [ ] Note components that re-render without prop/state changes
- [ ] Check for `onPress`/`renderItem` functions creating new references

### 3. Common Patterns to Investigate

| Pattern | What to look for |
|---------|-----------------|
| Inline functions | Arrow functions in `renderItem`, `onPress`, `onChangeText` |
| Unmemoized lists | FlatList/ScrollView items re-rendering on parent update |
| Store subscriptions | Component subscribing to entire Zustand store, not a selector |
| Context updates | Context value changing on every render (new object ref) |
| Parent re-render | Expensive parent causing all children to re-render |

### 4. Verify Fixes
- [ ] Apply `React.memo` to identified leaf components
- [ ] Wrap `renderItem` in `useCallback` for all FlatLists
- [ ] Replace bare `useStore()` calls with granular selectors
- [ ] Stabilize context values with `useMemo`
- [ ] Extract inline sub-components to memoized named components

### 5. Measure Improvement
- [ ] Run a second profiling session with same user flows
- [ ] Compare total commits count (before vs after)
- [ ] Compare component render count (before vs after)
- [ ] Verify no regressions in visual behavior

## Files Optimized (this batch)

| File | Change | Impact |
|------|--------|--------|
| `components/themed-text.tsx` | `React.memo` | Base text — used everywhere |
| `src/components/common/AppText.tsx` | `React.memo` | Base text — used everywhere |
| `src/components/common/PrimaryButton.tsx` | `React.memo` | Buttons in forms, cards |
| `src/components/ui/CachedImage.tsx` | `React.memo` | Image components in lists |
| `src/components/mobile/AccessibleButton.tsx` | `React.memo` | Touchable wrappers |
| `src/components/mobile/BookmarkList.tsx` | FlatList + memo extract + useCallback | List virtualization |
| `src/components/mobile/MobileSearch.tsx` | Memoized SuggestionItem + useCallback renderItem | Search suggestions + results |
| `src/components/mobile/MobileSettings.tsx` | `React.memo(SettingRow)` | Settings rows |
| `src/components/mobile/NotificationSettings.tsx` | `React.memo(SettingRow)` | Notification rows |
| `src/components/mobile/StatisticsDisplay.tsx` | Memoized StatItem | Stats grid |
| `src/components/mobile/QuizCarousel.tsx` | `useCallback(renderItem)` | Quiz carousel |
| `src/components/mobile/LessonCarousel.tsx` | `useCallback(renderItem)` | Lesson carousel |
| `src/components/mobile/SearchHistory.tsx` | `useCallback(renderItem)` | History list |
| `src/components/mobile/DownloadQueue.tsx` | `useCallback(renderItem)` | Download queue |
| `src/components/mobile/ConnectionManager.tsx` | `useCallback(renderItem)` | Connection list |
| `app/(tabs)/index.tsx` | Granular store selectors | Home screen |

## Additional Optimization Opportunities

### High Priority (next batch)
- [ ] Add granular selectors for `achievementStore`, `bookmarkStore`, `quizStore`, `settingsStore`, `notificationStore`
- [ ] Memoize `HomeScreenContent`, `MobileProfile`, `MobileCourseViewer` screen-level components
- [ ] Wrap `renderLessonContent` prop in `useCallback` at call sites of `LessonCarousel`

### Medium Priority
- [ ] Extract inline `LatencyRow` in `LatencyBar.tsx` to memoized component
- [ ] Extract inline `FilterSection` in `FilterSheet.tsx` to memoized component
- [ ] Memoize `MetricCard`, `AlertBanner`, `LatencyBar` in HealthDashboard

### Low Priority
- [ ] Consider code-splitting `MobileProfile` (1262 lines) into smaller memoized sub-components
- [ ] Evaluate `AuthContext` + `useAppStore` auth duplication
