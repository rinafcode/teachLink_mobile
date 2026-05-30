# Callback Patterns & useCallback Guide

## Overview

This document describes the callback memoization patterns used across the TeachLink mobile app. Following these patterns prevents unnecessary re-renders, keeps prop references stable, and improves overall component performance.

---

## Why useCallback?

React recreates every function defined inside a component on every render. When those functions are passed as props to child components, the child sees a new reference each time and re-renders — even if nothing meaningful changed. `useCallback` memoizes the function reference so it only changes when its declared dependencies change.

**Without useCallback:**
```tsx
// New function reference on every render → BookmarkButton re-renders every time parent renders
const handleToggle = async () => {
  await addBookmark(item);
};
```

**With useCallback:**
```tsx
// Stable reference → BookmarkButton only re-renders when bookmarked/item/store methods change
const handleToggle = useCallback(async () => {
  await addBookmark(item);
}, [bookmarked, item, addBookmark, removeBookmark]);
```

---

## Dependency Array Rules

| Dependency type | Include in array? | Notes |
|---|---|---|
| Props | ✅ Yes | Props can change between renders |
| Local state (`useState`) | ✅ Yes | State values change on `setState` calls |
| Other `useCallback` / `useMemo` values | ✅ Yes | They are stable references themselves |
| Zustand store **methods** (`addBookmark`, `setTheme`) | ✅ Yes | Zustand methods are stable but must be listed for exhaustive-deps |
| Zustand store **state slices** (`bookmarked`, `theme`) | ✅ Yes | These are values that change |
| `useRef` values (`.current`) | ❌ No | Refs are mutable and don't trigger re-renders |
| Module-level constants / `StyleSheet.create` | ❌ No | Never change |
| Setter functions from `useState` (`setFoo`) | ❌ No | React guarantees these are stable |

---

## Patterns Applied in This Codebase

### 1. Async event handlers (BookmarkButton, DownloadButton, AvatarCamera)

```tsx
const handleToggle = useCallback(async () => {
  if (bookmarked) {
    await removeBookmark(item.itemId);
  } else {
    await addBookmark(item);
  }
}, [bookmarked, item, addBookmark, removeBookmark]);
```

**Why:** The handler is passed directly to `onPress`. Without memoization, the `TouchableOpacity` receives a new prop on every parent render.

---

### 2. Form input handlers (MobileFormInput)

```tsx
const handleBlur = useCallback(
  (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setIsFocused(false);
    if (cacheKey && cacheOnBlur && value.trim()) {
      void setCachedFieldValue(cacheKey, value);
    }
    onBlur?.(e);
  },
  [cacheKey, cacheOnBlur, value, onBlur]
);

const handleFocus = useCallback(() => setIsFocused(true), []);
const handleTogglePassword = useCallback(() => setShowPassword(prev => !prev), []);
```

**Why:** `TextInput` receives these as `onFocus`/`onBlur` props. Stable references prevent the native input from receiving unnecessary prop updates.

---

### 3. Modal / camera handlers (AvatarCamera)

```tsx
const handleConfirm = useCallback(() => {
  if (preview) {
    onConfirm(preview);
    setPreview(null);
    resetCapturedImage();
    onClose();
  }
}, [preview, onConfirm, resetCapturedImage, onClose]);
```

**Why:** `onConfirm` and `onClose` are props from the parent. Including them in the dependency array ensures the callback always calls the latest version of those props.

---

### 4. Settings handlers (MobileSettings)

```tsx
const handleBiometricToggle = useCallback(async (value: boolean) => {
  if (value) {
    const ok = await enableBiometric();
    if (!ok) Alert.alert('Biometric Login', 'Enable failed. Check device settings.');
  } else {
    await disableBiometric();
  }
}, [enableBiometric, disableBiometric]);

const handleToggleAdvanced = useCallback(() => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  setShowAdvancedSettings(prev => !prev);
}, []);
```

**Why:** `handleToggleAdvanced` has an empty dependency array because it only calls `setShowAdvancedSettings` with a functional updater — no external values are captured.

---

### 5. Seek bar handlers (VideoControls)

```tsx
const positionFromEvent = useCallback((event: any) => {
  if (seekBarWidth <= 0 || durationMillis <= 0) return 0;
  const x = event.nativeEvent.locationX;
  return clamp((x / seekBarWidth) * durationMillis, 0, durationMillis);
}, [seekBarWidth, durationMillis]);

const handleSeekGrant = useCallback((event: any) => {
  if (!durationMillis) return;
  onSeekStart?.();
  const position = positionFromEvent(event);
  onSeekPreview?.(position);
}, [durationMillis, onSeekStart, onSeekPreview, positionFromEvent]);
```

**Why:** `positionFromEvent` is a derived helper used by three other callbacks. Memoizing it first, then listing it as a dependency of the seek handlers, creates a clean dependency chain and avoids stale closure bugs.

---

### 6. Swipeable row handlers (SwipeableRow)

```tsx
const triggerHaptic = useCallback(() => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}, []);

const executeDelete = useCallback(() => {
  isDeletedShared.value = true;
  translationX.value = withTiming(-SCREEN_WIDTH, { duration: 200 });
  itemHeight.value = withTiming(0, { duration: 250 }, finished => {
    if (finished && onDelete) runOnJS(onDelete)();
  });
}, [isDeletedShared, translationX, itemHeight, onDelete]);
```

**Why:** `triggerHaptic` is called via `runOnJS` inside a Reanimated worklet. A stable reference prevents the gesture handler from being rebuilt on every render. Shared values from `useSharedValue` are included in the dependency array because they are objects whose identity is stable but whose `.value` is read inside the callback.

---

### 7. Profile handlers (MobileProfile)

```tsx
const handleToggleFollow = useCallback((connectionId: string) => {
  setProfile(prev => ({
    ...prev,
    connections: prev.connections.map(c =>
      c.id === connectionId ? { ...c, isFollowing: !c.isFollowing } : c
    ),
  }));
}, []);
```

**Why:** Uses a functional `setProfile` updater so no external state is captured — empty dependency array is correct and the callback is maximally stable.

---

## Anti-Patterns to Avoid

### ❌ Inline arrow functions on frequently-rendered components

```tsx
// Bad — new function on every render
<TouchableOpacity onPress={() => setActiveTab(tab.key)} />

// Good — stable reference
const handleSelectTab = useCallback((tab: ProfileTab) => setActiveTab(tab), []);
<TouchableOpacity onPress={() => handleSelectTab(tab.key)} />
```

### ❌ Missing dependencies (stale closures)

```tsx
// Bad — stale closure: value captured at creation time, never updates
const handleSave = useCallback(async () => {
  await save(editName); // editName is stale!
}, []); // ← missing editName

// Good
const handleSave = useCallback(async () => {
  await save(editName);
}, [editName, save]);
```

### ❌ Over-memoizing trivial callbacks

```tsx
// Unnecessary — this component renders rarely and has no memo-wrapped children
const handlePress = useCallback(() => navigate('Home'), [navigate]);
```

Only apply `useCallback` when:
- The function is passed as a prop to a child component
- The function is used in a `useEffect` / `useMemo` dependency array
- The function is called via `runOnJS` in a Reanimated worklet
- The component renders frequently (list items, video controls, form inputs)

---

## ESLint Enforcement

The following rules are active in `eslint.config.js`:

```js
'react-hooks/rules-of-hooks': 'error',        // Hooks must follow the Rules of Hooks
'react-hooks/exhaustive-deps': 'warn',         // Dependency arrays must be complete
'react/no-unstable-nested-components': 'warn', // No inline component definitions
```

`exhaustive-deps` is set to `warn` (not `error`) to allow intentional empty arrays where functional updaters make them safe. Always add a comment when intentionally omitting a dependency.

---

## Files Updated

| File | Callbacks memoized |
|---|---|
| `BookmarkButton.tsx` | `handleToggle` |
| `DownloadButton.tsx` | `handlePress`, `renderIcon`, `getLabel` |
| `AvatarCamera.tsx` | `handleTakePhoto`, `handlePickFromLibrary`, `handleConfirm`, `handleRetake`, `handleClose` |
| `MobileFormInput.tsx` | `handleBlur`, `handleApplySuggestion`, `handleFocus`, `handleTogglePassword` |
| `MobileSettings.tsx` | `handleClearFormCache`, `handleBiometricToggle`, `handleSignOut`, `handleManualSync`, `handleClearDownloads`, `handleToggleAdvanced` |
| `VideoControls.tsx` | `handleSeekBarLayout`, `positionFromEvent`, `handleSeekGrant`, `handleSeekMove`, `handleSeekRelease`, `handleSeekTerminate`, `handleToggleSpeedMenu`, `handleToggleQualityMenu`, `handleSelectRate`, `handleSelectQualityOption` |
| `SwipeableRow.tsx` | `triggerHaptic`, `handleLayout`, `executeDelete`, `executeArchive` |
| `MobileProfile.tsx` | `getInitials`, `handleStartEdit`, `handleToggleAdvancedFields`, `validateForm`, `handleSave`, `handleCancelEdit`, `handleAvatarConfirm`, `handleToggleFollow`, `handleOpenCamera`, `handleCloseCamera`, `handleSelectTab` |
