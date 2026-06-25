# Touch Event Deduplication — Specification

> **Issue:** #330  
> **Branch:** `feat/330-touch-event-deduplication`

## Overview

React Native apps can receive multiple touch events for a single physical tap.
This happens because:

- The JavaScript bridge can deliver `touchstart`/`touchend` events alongside
  synthetic `press` events from gesture recognisers.
- On some Android devices the touch layer re-fires an event after the
  accessibility service processes it.
- Fast consecutive taps (e.g. users tapping repeatedly while waiting for a
  response) should only trigger one action per deduplication window.

The `useTouchDeduplication` hook solves this by recording the **timestamp** and
**screen coordinates** of the last accepted tap. Any subsequent tap that
arrives within the deduplication window _and_ at the same location is silently
dropped.

---

## Constants

| Constant          | Value  | Rationale                                                                                                      |
| ----------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `DEDUP_WINDOW_MS` | 300 ms | Matches the platform double-tap detection window; sub-300 ms taps at the same point are considered duplicates. |
| `DEDUP_RADIUS_PX` | 10 px  | Accounts for natural finger drift between two events from the same tap.                                        |

---

## API

```ts
import { useTouchDeduplication } from '@/hooks/useTouchDeduplication';

const { deduplicateTap, isFreshTap, reset } = useTouchDeduplication(options?);
```

### Options

| Prop       | Type     | Default | Description                                  |
| ---------- | -------- | ------- | -------------------------------------------- |
| `windowMs` | `number` | `300`   | Time window (ms) for duplicate suppression.  |
| `radiusPx` | `number` | `10`    | Spatial radius (px) for same-location check. |

### Return values

#### `deduplicateTap(coords, handler)`

Convenience wrapper. Calls `handler` only when the tap at `coords` is fresh.

```ts
const handlePress = (event: GestureResponderEvent) => {
  deduplicateTap({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }, submitForm);
};
```

#### `isFreshTap(coords): boolean`

Lower-level predicate. Returns `true` (and advances state) when the tap is
fresh; `false` when it is a duplicate.

```ts
const handlePress = (event: GestureResponderEvent) => {
  if (!isFreshTap({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })) {
    return; // duplicate — ignore
  }
  submitForm();
};
```

#### `reset()`

Clears internal tap state. Call this after navigating away from a screen or
after a form is successfully submitted so the user can re-tap immediately.

---

## Deduplication Logic

```
isFreshTap(coords):
  now  ← Date.now()
  last ← lastTapRef.current

  if last is not null:
    elapsed    ← now - last.timestamp
    distanceSq ← (coords.x - last.x)² + (coords.y - last.y)²

    if elapsed < windowMs AND distanceSq ≤ radiusPx²:
      return false   ← duplicate suppressed

  lastTapRef.current ← { timestamp: now, x: coords.x, y: coords.y }
  return true        ← accepted
```

A `useRef` is used (not `useState`) so that state updates are synchronous and
do **not** trigger a re-render — preventing any visual flicker from the
deduplication guard itself.

---

## Usage Examples

### Form submission

```tsx
import { useTouchDeduplication } from '@/hooks/useTouchDeduplication';

function LoginForm() {
  const { deduplicateTap, reset } = useTouchDeduplication();

  const handleSubmit = (event: GestureResponderEvent) => {
    deduplicateTap({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }, async () => {
      await submitLogin();
      reset(); // allow re-submission after success
    });
  };

  return (
    <TouchableOpacity onPress={handleSubmit}>
      <Text>Login</Text>
    </TouchableOpacity>
  );
}
```

### Navigation actions

```tsx
function CourseCard({ courseId }: { courseId: string }) {
  const { deduplicateTap } = useTouchDeduplication();
  const router = useRouter();

  const handleNavigate = (event: GestureResponderEvent) => {
    deduplicateTap({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }, () =>
      router.push(`/course/${courseId}`)
    );
  };

  return <TouchableOpacity onPress={handleNavigate}>…</TouchableOpacity>;
}
```

---

## Testing

Tests are located in `tests/hooks/useTouchDeduplication.test.ts`.

Run the hook tests specifically:

```bash
npx jest tests/hooks/useTouchDeduplication.test.ts
```

### Coverage

| Scenario                                             | Tested |
| ---------------------------------------------------- | ------ |
| First tap always accepted                            | ✅     |
| Duplicate at same location within 300 ms rejected    | ✅     |
| Tap accepted after window expires (≥ 300 ms)         | ✅     |
| Tap at different location within window accepted     | ✅     |
| Tap within 10 px radius rejected                     | ✅     |
| Tap outside 10 px radius accepted                    | ✅     |
| `deduplicateTap` calls handler once on fresh tap     | ✅     |
| `deduplicateTap` suppresses handler on duplicate     | ✅     |
| Form double-submit: single tap → single handler call | ✅     |
| `reset()` clears state for immediate re-tap          | ✅     |
| Custom `windowMs` respected                          | ✅     |
| Custom `radiusPx` respected                          | ✅     |

---

## Files Changed

| File                                        | Action                        |
| ------------------------------------------- | ----------------------------- |
| `src/hooks/useTouchDeduplication.ts`        | **New** — hook implementation |
| `src/hooks/index.ts`                        | **Modified** — export added   |
| `tests/hooks/useTouchDeduplication.test.ts` | **New** — test suite          |
| `docs/TOUCH_EVENT_DEDUPLICATION.md`         | **New** — this document       |
