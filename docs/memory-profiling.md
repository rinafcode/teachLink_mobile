# Memory Profiling (development tooling)

> Issue #378 — in-app memory profiler for TeachLink Mobile.

## Overview

The memory profiler is a **development-only** tool that surfaces JavaScript heap
usage from inside the running app. It is useful when you want a quick, on-device
read on memory behaviour while navigating screens — without attaching an external
debugger — and especially for spotting a screen or interaction that leaks memory
(heap that keeps climbing and never comes back down).

## Automatic Memory Pressure Protection

This app now includes an automatic memory pressure guard that activates when
Hermes heap utilization exceeds **70%**. When high memory pressure is detected,
the app proactively:

- clears the Expo image memory and disk cache
- pauses predictive route and asset prefetching
- stops background request queue monitoring
- stops automatic sync processing
- clears internal sync event listeners

This protection is designed to reduce the risk of OOM crashes on low-memory
devices while allowing normal background work to resume once pressure recovers.


It consists of three pieces:

| Piece                  | File                                            | Role                                                                    |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| Data source + analysis | `src/utils/memoryProfiler.ts`                   | Reads Hermes heap stats, formats bytes, runs the leak heuristic         |
| Polling hook           | `hooks/useMemoryProfiler.ts`                    | Samples on an interval, keeps a rolling window, derives the leak signal |
| Overlay UI             | `components/DevTools/MemoryProfilerOverlay.tsx` | Floating panel with metrics, a sparkline, and controls                  |

**It is completely absent from production builds.** The overlay is re-exported
through `components/DevTools/index.ts`, which resolves to a no-op `() => null`
component when `__DEV__` is `false` — so the implementation, its polling, and its
`react-native-svg` usage are never bundled or executed in production. The hook
additionally refuses to start its interval outside `__DEV__`.

## How to use

1. Run the app in development:
   ```bash
   npx expo start
   ```
2. Look for the floating **`MEM`** badge near the bottom-left of the screen. When
   collapsed it shows the current used-heap value (e.g. `MEM  45.2 MB`) and a ⚠️
   icon if a leak is currently suspected.
3. **Tap the badge to expand** the full panel.
4. Navigate around the app. The metrics and sparkline refresh every ~2 seconds.
5. If the **⚠️ Potential leak suspected** warning appears, note which screen(s) you
   were on when the heap began its sustained climb — that is where to investigate.
   A matching warning is also written to the Metro console via `appLogger`.

### Controls

| Control                | Action                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `[–]`                  | Collapse the panel back to the badge                                                              |
| `[✕]`                  | Hide the overlay for the rest of the session (reappears on next app reload; nothing is persisted) |
| `[Pause]` / `[Resume]` | Stop / restart sampling                                                                           |
| `[Clear]`              | Empty the sample window (resets the sparkline)                                                    |
| `[Log Snapshot]`       | Write the current snapshot to the Metro console via `appLogger.infoSync`                          |

## Understanding the metrics

All values come from Hermes' instrumented GC statistics
(`global.HermesInternal.getInstrumentedStats()`).

- **Used heap** — the bytes currently occupied by live + not-yet-collected JS
  objects. This is the number that matters most for leak hunting: a healthy app's
  used heap rises and falls as the GC runs; a leak shows up as a used heap that
  only rises.
- **Total heap** — the heap's current _capacity_. The engine grows this as needed,
  so it is normally larger than used heap and changes less often.
- **External** — memory held outside the JS heap but tracked by Hermes (e.g.
  ArrayBuffers). It does **not** include native allocations such as image
  decoding buffers or native module memory.
- **Utilisation %** — `used heap ÷ total heap`, rounded. A high, steadily-climbing
  utilisation can precede a heap growth, but on its own it is not a leak signal.

### The sparkline

The sparkline plots **used heap** over the retained sample window (the last 30
samples by default — roughly the last 60 seconds at the 2-second interval). The
Y-axis **auto-scales** to the min and max of the values currently in the window,
so the line emphasises _relative_ movement rather than absolute size; a gently
sloping line over a small range and a steep line over a large range can look
similar. Read the metric values above the chart for absolute figures. The line is
drawn amber while a leak is suspected, blue otherwise.

## Leak detection heuristic

The leak signal (`detectLeak` in `src/utils/memoryProfiler.ts`) is intentionally
simple and conservative:

1. It needs at least **6 snapshots**; with fewer it reports no leak.
2. It looks only at the **most recent 6 snapshots**.
3. It flags a suspected leak only when used heap grew **strictly monotonically**
   across all 6 consecutive samples **and** the total first-to-last growth exceeds
   **10 MB**.

This is a **heuristic, not a guarantee**. Known failure modes:

- **False positives** — an intentional, legitimate allocation burst (loading a
  large list, warming a cache, decoding several images) can look like sustained
  growth for a handful of samples and trip the warning even though memory will be
  reclaimed shortly after.
- **False negatives** — a slow leak whose growth is interrupted by periodic GC
  (so any one 6-sample window is not strictly increasing) will not be flagged,
  even though memory trends upward over minutes. Watching the sparkline over a
  longer period catches these better than the binary signal does.

Treat the warning as a prompt to investigate, not a verdict.

## Limitations

- **Hermes only.** The profiler reads Hermes' instrumented stats. Expo uses Hermes
  by default since SDK 48 (this app is on SDK 54 with no `jsEngine: "jsc"`
  override, so Hermes is active). On a non-Hermes engine the API is absent and the
  overlay shows _"Memory API unavailable (non-Hermes engine)"_ instead of metrics
  — it never crashes or fabricates values.
- **JavaScript heap only.** It does not measure native memory, native image
  caches, GPU memory, or allocations made by native modules. A screen can grow
  native memory while the JS heap stays flat.
- **Heuristic detection only.** For authoritative profiling use a native profiler
  (see below).
- **Not available in production.** The overlay renders `null` and the hook never
  samples outside `__DEV__`.

## Using with Flipper / native profilers

For production-grade investigation, reach for the platform-native tools rather
than this in-app overlay. Use **Android Studio's Memory Profiler** (Profiler →
Memory) to capture heap dumps and track native + Java/Kotlin allocations on
Android, and **Xcode Instruments** (Allocations / Leaks templates) for iOS native
memory. React Native's debugging tools and the Hermes debugger can be attached for
deeper JS-level inspection. See the Expo debugging guide
(<https://docs.expo.dev/debugging/tools/>) and the React Native performance docs
(<https://reactnative.dev/docs/performance>) for current, engine-specific guidance.

## API reference

### `src/utils/memoryProfiler.ts`

```ts
interface MemorySnapshot {
  timestamp: number; // Date.now() at capture
  heapSizeBytes: number; // total heap capacity, 0 when unavailable
  usedHeapBytes: number; // used portion of the heap, 0 when unavailable
  externalBytes: number; // external (off-heap) memory, 0 when unavailable
  available: boolean; // false when HermesInternal stats are inaccessible
}

// Capture a single reading. Callers must gate behind __DEV__.
function captureMemorySnapshot(): MemorySnapshot;

// Heuristic: true when the last 6 samples grew strictly monotonically by >10MB.
function detectLeak(snapshots: MemorySnapshot[]): boolean;

// Human-readable bytes, e.g. "45.2 MB", "512 B", "0 B".
function formatBytes(bytes: number): string;

const LEAK_SAMPLE_WINDOW = 6; // samples examined
const LEAK_GROWTH_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10 MB
```

### `hooks/useMemoryProfiler.ts`

```ts
interface UseMemoryProfilerOptions {
  intervalMs?: number; // poll interval, default 2000
  maxSnapshots?: number; // rolling window size, default 30
  enabled?: boolean; // default true; false never starts the interval
}

interface UseMemoryProfilerResult {
  snapshots: MemorySnapshot[]; // rolling window, oldest first
  latest: MemorySnapshot | null; // most recent, or null before first capture
  isLeakSuspected: boolean; // derived from detectLeak()
  isAvailable: boolean; // false on non-Hermes engines
  clearSnapshots: () => void; // empty the window
  pause: () => void; // stop sampling
  resume: () => void; // restart sampling
  isPaused: boolean;
}

function useMemoryProfiler(options?: UseMemoryProfilerOptions): UseMemoryProfilerResult;
```

The hook samples only when `__DEV__ === true`, `enabled` is `true`, and it is not
paused. It caps the window at `maxSnapshots` (dropping the oldest), cleans up its
interval on unmount and whenever `enabled`/`intervalMs`/`maxSnapshots` change, and
logs a single `appLogger.warnSync('Potential memory leak detected', …)` on each
`false → true` leak transition.
