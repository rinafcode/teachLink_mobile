# Memory Optimization Strategy

This document outlines the memory optimization strategy and monitoring capabilities built into TeachLink Mobile.

## Overview

High-end mobile devices can handle heavy workloads, but lower-end devices (<2GB RAM) are highly susceptible to Out-Of-Memory (OOM) crashes. In React Native, memory spikes typically originate from:

1. Massive scroll lists retaining off-screen elements in memory.
2. Uncontrolled state/cache growth causing memory leaks.
3. Rapid UI transitions allocating heavy graphics contexts faster than the JS engine can reclaim them.

To mitigate this, TeachLink Mobile uses **automated real-time memory monitoring and leak detection** to alert developers, trigger safe garbage collection, and send telemetry data for remote analysis.

---

## The `useMemoryMonitor` Hook

The `useMemoryMonitor` hook is a production-safe monitoring hook that tracks both list sizes (collection items) and JS heap memory.

### API Reference

```typescript
import { useMemoryMonitor } from './hooks';

const { isHighMemory, isCriticalMemory, heapUsedBytes, isLeakSuspected } = useMemoryMonitor({
  componentId: 'MyComponent',
  itemCount: data.length,
  thresholdWarning: 100, // Warning threshold for list size
  thresholdCritical: 500, // Critical threshold for list size
});
```

### Options

| Option              | Type     | Description                                                            | Default    |
| ------------------- | -------- | ---------------------------------------------------------------------- | ---------- |
| `componentId`       | `string` | Unique identifier for tracing logs and telemetry.                      | _Required_ |
| `itemCount`         | `number` | Number of items currently loaded or rendered in the list.              | `0`        |
| `thresholdWarning`  | `number` | Item count threshold above which warning events are triggered.         | `100`      |
| `thresholdCritical` | `number` | Item count threshold above which critical rendering spikes are warned. | `500`      |

### Return Value

- `isHighMemory` (`boolean`): True when `itemCount` exceeds `thresholdWarning`.
- `isCriticalMemory` (`boolean`): True when `itemCount` exceeds `thresholdCritical`.
- `heapUsedBytes` (`number`): The current used JS heap bytes (or `0` if stats are unavailable).
- `isLeakSuspected` (`boolean`): True if a sustained memory growth pattern is identified.

---

## Leak Detection Heuristics

`useMemoryMonitor` tracks a rolling history of the last 20 heap snapshots. Using `detectLeak` from `src/utils/memoryProfiler.ts`, it flags a memory leak when:

- At least **6 snapshots** have been captured.
- JS heap usage grows **strictly monotonically** across 6 consecutive check cycles.
- The total growth from the first to the last snapshot in that window exceeds **10 MB**.

### When a Leak is Flagged

1. A warning is written to Metro logs (`logger.warn`).
2. An analytics performance event is dispatched (`mobileAnalyticsService.trackEvent`) with `metric: 'memory_leak_suspected'`.
3. Garbage collection is requested via `global.gc()` if available.

---

## Approaching Device RAM Limits (>80% RAM Alert)

TeachLink Mobile queries the device's physical memory configuration using `expo-device` (`Device.totalMemory`).

If the JS heap memory used exceeds **80% of the device's total RAM**:

1. A critical error is written to logs (`logger.error`).
2. A non-blocking developer/user alert is displayed using `Alert.alert`.
3. A telemetry alert event is logged (`mobileAnalyticsService.trackEvent`) with `metric: 'high_memory_alert'`.
4. Garbage collection is triggered to immediately reclaim dereferenced heap memory.

---

## Best Practices for List Optimizations

For components rendering complex or infinite feeds, use `VirtualList` or `InfiniteVirtualList` to prevent memory leaks and UI stutter. Key optimizations configured automatically:

1. **`removeClippedSubviews={true}`**
   Unmounts offscreen component trees, freeing native view layouts and image decoders.
2. **`windowSize={5}` (or `3` on low-end devices)**
   Defines the maximum offscreen render buffer size. Stepping down windowSize directly limits memory footprint.

3. **`initialNumToRender={10}` & `maxToRenderPerBatch={10}`**
   Ensures small batches of elements are rendered sequentially, preventing blocking of the JS thread.

4. **`updateCellsBatchingPeriod={50}` (or `100` on low-end devices)**
   Yields control back to the native UI thread, prioritizing layout performance and scrolling smoothness.
