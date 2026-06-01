/**
 * MemoryProfilerOverlay — Issue #378 (DEVELOPMENT ONLY)
 *
 * UI-only component; tested manually (testing a floating, absolutely-positioned
 * overlay with mocked layout is low value — see docs/memory-profiling.md).
 *
 * A floating, semi-transparent panel that visualises Hermes heap usage in dev
 * builds. It renders `null` when `!__DEV__`, and is additionally guarded by the
 * conditional re-export in `components/DevTools/index.ts` so that Metro never
 * bundles it into production at the import site.
 */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { useMemoryProfiler } from '../../hooks/useMemoryProfiler';
import { appLogger } from '../../src/utils/logger';
import { formatBytes } from '../../src/utils/memoryProfiler';

const SPARKLINE_WIDTH = 232;
const SPARKLINE_HEIGHT = 48;

/** Build an SVG polyline `points` string from used-heap samples, auto-scaling Y. */
function buildSparklinePoints(used: number[]): string {
  if (used.length < 2) {
    return '';
  }

  const min = Math.min(...used);
  const max = Math.max(...used);
  const range = max - min || 1; // avoid divide-by-zero on a flat line
  const stepX = SPARKLINE_WIDTH / (used.length - 1);

  return used
    .map((value, index) => {
      const x = index * stepX;
      // Invert Y so larger values render higher on screen.
      const y = SPARKLINE_HEIGHT - ((value - min) / range) * SPARKLINE_HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

const MemoryProfilerOverlay = () => {
  const {
    snapshots,
    latest,
    isLeakSuspected,
    isAvailable,
    clearSnapshots,
    pause,
    resume,
    isPaused,
  } = useMemoryProfiler();

  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);

  const points = useMemo(
    () => buildSparklinePoints(snapshots.map(s => s.usedHeapBytes)),
    [snapshots]
  );

  // Hooks are always called above this line (rules-of-hooks). Below, we gate
  // rendering: belt-and-suspenders never render in production (the conditional
  // re-export in DevTools/index.ts also swaps this out), and honour the
  // session-scoped hide toggle.
  if (!__DEV__ || hidden) {
    return null;
  }

  const utilisation =
    latest && latest.heapSizeBytes > 0
      ? Math.round((latest.usedHeapBytes / latest.heapSizeBytes) * 100)
      : 0;

  const logSnapshot = () => {
    appLogger.infoSync('Memory snapshot', {
      snapshot: latest ?? null,
      isLeakSuspected,
      isPaused,
    });
  };

  // `box-none` lets touches pass through the (transparent) container to the app
  // underneath, while the button/panel children still receive their own touches.
  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-8 left-4 z-50"
      accessibilityLabel="Memory profiler overlay"
    >
      {!expanded ? (
        <Pressable
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel="Expand memory profiler"
          className="flex-row items-center self-start rounded-full bg-black/80 px-3 py-1.5"
        >
          <Text className="text-xs font-bold tracking-wider text-white">MEM</Text>
          <Text className="ml-2 text-xs font-medium text-white">
            {isAvailable && latest ? formatBytes(latest.usedHeapBytes) : 'n/a'}
          </Text>
          {isLeakSuspected ? (
            <Ionicons name="warning" size={12} color="#fbbf24" style={{ marginLeft: 6 }} />
          ) : null}
        </Pressable>
      ) : (
        <View className="w-72 rounded-2xl bg-black/80 p-3">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
              Memory Profiler
            </Text>
            <View className="flex-row items-center">
              <Pressable
                onPress={() => setExpanded(false)}
                accessibilityRole="button"
                accessibilityLabel="Collapse memory profiler"
                className="ml-2 h-6 w-6 items-center justify-center rounded-full bg-white/10"
              >
                <Ionicons name="remove" size={14} color="#ffffff" />
              </Pressable>
              <Pressable
                onPress={() => setHidden(true)}
                accessibilityRole="button"
                accessibilityLabel="Hide memory profiler for this session"
                className="ml-2 h-6 w-6 items-center justify-center rounded-full bg-white/10"
              >
                <Ionicons name="close" size={14} color="#ffffff" />
              </Pressable>
            </View>
          </View>

          <View className="my-2 h-px bg-white/10" />

          {!isAvailable ? (
            <Text className="text-xs text-white/70">
              Memory API unavailable (non-Hermes engine)
            </Text>
          ) : (
            <>
              {/* Metrics */}
              <View className="gap-1">
                <MetricRow label="Used heap" value={formatBytes(latest?.usedHeapBytes ?? 0)} />
                <MetricRow label="Total heap" value={formatBytes(latest?.heapSizeBytes ?? 0)} />
                <MetricRow label="External" value={formatBytes(latest?.externalBytes ?? 0)} />
                <MetricRow label="Utilisation" value={`${utilisation}%`} />
              </View>

              <View className="my-2 h-px bg-white/10" />

              {/* Sparkline */}
              <View accessibilityLabel="Used heap over the last samples">
                <Svg width={SPARKLINE_WIDTH} height={SPARKLINE_HEIGHT}>
                  <Line
                    x1={0}
                    y1={SPARKLINE_HEIGHT - 0.5}
                    x2={SPARKLINE_WIDTH}
                    y2={SPARKLINE_HEIGHT - 0.5}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={1}
                  />
                  {points ? (
                    <Polyline
                      points={points}
                      fill="none"
                      stroke={isLeakSuspected ? '#fbbf24' : '#38bdf8'}
                      strokeWidth={1.5}
                    />
                  ) : null}
                </Svg>
              </View>

              {isLeakSuspected ? (
                <>
                  <View className="my-2 h-px bg-white/10" />
                  <Text className="text-xs font-semibold text-amber-400">
                    ⚠️ Potential leak suspected
                  </Text>
                </>
              ) : null}
            </>
          )}

          <View className="my-2 h-px bg-white/10" />

          {/* Controls */}
          <View className="flex-row justify-between">
            <ControlButton
              label={isPaused ? 'Resume' : 'Pause'}
              accessibilityLabel={isPaused ? 'Resume memory sampling' : 'Pause memory sampling'}
              onPress={isPaused ? resume : pause}
            />
            <ControlButton
              label="Clear"
              accessibilityLabel="Clear memory snapshots"
              onPress={clearSnapshots}
            />
            <ControlButton
              label="Log Snapshot"
              accessibilityLabel="Log current memory snapshot"
              onPress={logSnapshot}
            />
          </View>
        </View>
      )}
    </View>
  );
};

interface MetricRowProps {
  label: string;
  value: string;
}

const MetricRow = ({ label, value }: MetricRowProps) => (
  <View className="flex-row justify-between">
    <Text className="text-xs text-white/60">{label}</Text>
    <Text className="text-xs font-medium text-white">{value}</Text>
  </View>
);

interface ControlButtonProps {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}

const ControlButton = ({ label, accessibilityLabel, onPress }: ControlButtonProps) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    className="rounded-lg bg-white/10 px-2.5 py-1.5"
  >
    <Text className="text-xs font-medium text-white">{label}</Text>
  </Pressable>
);

export default MemoryProfilerOverlay;
