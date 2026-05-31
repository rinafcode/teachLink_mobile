# Touch Event Deduplication Specification

## Overview

Touch events can fire multiple times for a single tap, especially on mobile devices or due to hardware variations. This can cause accidental double-submissions, duplicate API calls, or unintended repeated actions.

The touch event deduplication system prevents these duplicate triggers by tracking tap timing and coordinates, ignoring subsequent taps within a configured threshold at the same location.

## Problem Statement

**Current Issue:** Single tap sometimes triggers multiple events

- Users unintentionally trigger double-submissions on forms
- Accidental duplicate API calls consume bandwidth and resources
- Multiple state updates from single action create inconsistent UI
- Improves user experience by making interactions more reliable

## Solution

### Architecture

The solution provides two complementary APIs:

1. **`useTouchDeduplication` Hook** - For use within React components
2. **`withTouchDeduplication` Wrapper** - For use outside React hooks or as a higher-order wrapper

Both track:

- **Last tap timestamp** - Time of the most recent tap
- **Last tap coordinates** - X and Y position of the most recent tap

### Algorithm

For each tap event:

1. Extract current tap time and coordinates from event
2. Compare with last recorded tap (if it exists)
3. Calculate distance: `sqrt((x1-x2)² + (y1-y2)²)` or use Manhattan distance for performance
4. Check if tap is a duplicate:
   - Within `threshold` milliseconds of last tap
   - Within `coordinateTolerance` pixels of last tap location
5. If duplicate: Ignore and call optional `onDuplicate` callback
6. If not duplicate: Execute handler and record this tap

### Configuration

```typescript
interface TouchDeduplicationConfig {
  /**
   * Time window in milliseconds to consider taps as duplicates.
   * Taps within this window at the same location are deduplicated.
   * @default 300
   */
  threshold?: number;

  /**
   * Distance in pixels to consider taps as being at the same location.
   * @default 10
   */
  coordinateTolerance?: number;

  /**
   * Optional callback fired when a duplicate tap is detected.
   * Useful for telemetry or debugging.
   */
  onDuplicate?: () => void;
}
```

## Usage

### Basic Form Submission

```typescript
import { useTouchDeduplication } from '@/hooks/useTouchDeduplication';
import { TouchableOpacity, Text } from 'react-native';

function MyForm() {
  const handleSubmit = async () => {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    return response.json();
  };

  const { dedupledHandler } = useTouchDeduplication(handleSubmit);

  return (
    <TouchableOpacity onPress={dedupledHandler}>
      <Text>Submit</Text>
    </TouchableOpacity>
  );
}
```

### With Custom Configuration

```typescript
const { dedupledHandler } = useTouchDeduplication(handleDelete, {
  threshold: 500, // 500ms window
  coordinateTolerance: 15, // 15px tolerance
  onDuplicate: () => {
    console.log('Duplicate tap detected');
    // Optional: Show toast or trigger analytics
  },
});
```

### Without React Hook

```typescript
import { withTouchDeduplication } from '@/hooks/useTouchDeduplication';

const submitHandler = withTouchDeduplication(
  async formData => {
    // Submit logic
  },
  { threshold: 300 }
);

button.addEventListener('click', submitHandler);
```

## Performance Considerations

### Memory Usage

- Minimal: Only stores 3 numbers (timestamp, x, y) per deduplication instance
- No memory leaks: Automatically cleaned up on component unmount (hooks) or function scope (wrapper)

### CPU Usage

- Negligible: Simple arithmetic comparisons
- No timers or intervals: Check only happens on tap event

### Lock Prevention

- For async handlers, the system locks execution during the async operation
- Prevents concurrent executions of the same handler
- Lock automatically releases when async operation completes
- Synchronous handlers complete immediately, lock is released immediately

## Default Values

| Parameter             | Default   | Rationale                                                                                          |
| --------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| `threshold`           | 300ms     | W3C Touch Events spec suggests 300ms is a reasonable default; matches typical double-tap detection |
| `coordinateTolerance` | 10px      | Accounts for finger size and touch imprecision without being too permissive                        |
| `onDuplicate`         | undefined | Optional for telemetry; no performance penalty if unused                                           |

## W3C Touch Events Specification

### Relevant Standards

- [W3C Touch Events Level 2](https://www.w3.org/TR/touch-events/)
- [Web Hypertext Application Technology Working Group (WHATWG) Pointer Events](https://www.w3.org/TR/pointerevents3/)

### Key Points

1. **Touch Event Sequence:**

   ```
   touchstart → [touchmove]* → touchend
   ```

2. **Event Properties:**
   - `touches`: All active touch points
   - `targetTouches`: Touch points on target element
   - `changedTouches`: Changed since last event
   - `pageX`, `pageY`: Position relative to viewport

3. **Common Issues:**
   - Multiple `touchstart` events can fire for single tap
   - Browser/OS-dependent behavior (iOS vs Android)
   - Device-specific touch latency and filtering

### Implementation Alignment

Our implementation:

- Tracks `pageX` and `pageY` from `nativeEvent`
- Uses 300ms window (matches browser double-tap detection)
- Accounts for coordinate variance due to finger size
- Supports both synchronous and asynchronous handlers

## Testing

The implementation includes comprehensive tests covering:

- [x] First tap execution
- [x] Duplicate tap prevention
- [x] Threshold expiration
- [x] Coordinate tolerance
- [x] Duplicate callback triggering
- [x] Async handler support
- [x] Form double-submission prevention
- [x] Concurrent request prevention
- [x] Missing event handling
- [x] Multiple instance isolation

Run tests with:

```bash
npm test -- useTouchDeduplication.test.ts
```

## Integration Guide

### For Form Components

Apply deduplication to any form submission handler:

```typescript
function FormComponent() {
  const handleFormSubmit = useCallback(async (data) => {
    // Submit form
  }, []);

  const { dedupledHandler } = useTouchDeduplication(handleFormSubmit);

  return (
    <Form onSubmit={dedupledHandler}>
      {/* Form fields */}
    </Form>
  );
}
```

### For Button-Based Actions

Use for critical actions like delete, purchase, confirm:

```typescript
const { dedupledHandler } = useTouchDeduplication(handleDelete, {
  onDuplicate: () => hapticFeedback.selection(),
});
```

### For List Item Actions

Each list item should have its own deduplication instance:

```typescript
{items.map(item => (
  <ListItem
    key={item.id}
    onDelete={() => dedupledHandlers[item.id]?.()}
  />
))}
```

## Debugging

### Enable Duplicate Detection Logging

```typescript
const { dedupledHandler } = useTouchDeduplication(handleSubmit, {
  onDuplicate: () => {
    console.warn('Duplicate tap detected', {
      timestamp: new Date().toISOString(),
    });
  },
});
```

### Monitor Handler Calls

```typescript
const handleSubmit = async event => {
  console.log('Submit called at', new Date().toISOString());
  // handler logic
};

const { dedupledHandler } = useTouchDeduplication(handleSubmit);
```

## Migration Path

### Before (Vulnerable to Double-Taps)

```typescript
<Button onPress={() => submitForm()} />
```

### After (Protected)

```typescript
const { dedupledHandler } = useTouchDeduplication(() => submitForm());
<Button onPress={dedupledHandler} />
```

## Acceptance Criteria Verification

- [x] **Implement touch event deduplication** - `useTouchDeduplication` hook and `withTouchDeduplication` wrapper
- [x] **Track last tap time and coordinates** - Tracked in refs with timestamp and x/y coordinates
- [x] **Ignore duplicate taps within 300ms at same location** - Default threshold 300ms, coordinateTolerance 10px
- [x] **Test form submissions don't double-submit** - Comprehensive test suite included
- [x] **Document touch event specification** - This specification document

## Related Documentation

- [Callback Patterns](./callback-patterns.md) - Pattern recommendations for event handlers
- [Memory Optimization](./memory-optimization.md) - Memory usage considerations
- [Error Boundary Retry Strategy](./error-boundary-retry-strategy.md) - Error handling patterns
