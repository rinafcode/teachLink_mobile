/**
 * CacheStatusOverlay - development-only API cache visibility.
 *
 * The component is loaded through components/DevTools/index.ts, which swaps it
 * out in production builds so cache diagnostics stay development-only.
 */
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getCacheStats } from '../../src/services/api/cache';

type CacheStats = ReturnType<typeof getCacheStats>;

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const CacheStatusOverlay = () => {
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [stats, setStats] = useState<CacheStats>(() => getCacheStats());

  useEffect(() => {
    if (!__DEV__ || hidden) {
      return;
    }

    const refresh = () => setStats(getCacheStats());
    refresh();

    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [hidden]);

  if (!__DEV__ || hidden) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-8 right-4 z-50"
      accessibilityLabel="API cache status overlay"
    >
      {!expanded ? (
        <Pressable
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel="Expand API cache status"
          className="flex-row items-center self-end rounded-full bg-black/80 px-3 py-1.5"
        >
          <Text className="text-xs font-bold tracking-wider text-white">CACHE</Text>
          <Text className="ml-2 text-xs font-medium text-white">
            {formatPercent(stats.hitRate)}
          </Text>
        </Pressable>
      ) : (
        <View className="w-72 rounded-xl bg-black/80 p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
              API Cache
            </Text>
            <View className="flex-row items-center">
              <Pressable
                onPress={() => setStats(getCacheStats())}
                accessibilityRole="button"
                accessibilityLabel="Refresh API cache status"
                className="ml-2 h-6 items-center justify-center rounded-full bg-white/10 px-2"
              >
                <Text className="text-xs font-medium text-white">Refresh</Text>
              </Pressable>
              <Pressable
                onPress={() => setExpanded(false)}
                accessibilityRole="button"
                accessibilityLabel="Collapse API cache status"
                className="ml-2 h-6 items-center justify-center rounded-full bg-white/10 px-2"
              >
                <Text className="text-xs font-medium text-white">Close</Text>
              </Pressable>
              <Pressable
                onPress={() => setHidden(true)}
                accessibilityRole="button"
                accessibilityLabel="Hide API cache status for this session"
                className="ml-2 h-6 items-center justify-center rounded-full bg-white/10 px-2"
              >
                <Text className="text-xs font-medium text-white">Hide</Text>
              </Pressable>
            </View>
          </View>

          <View className="my-2 h-px bg-white/10" />

          <MetricRow label="Hit rate" value={formatPercent(stats.hitRate)} />
          <MetricRow label="Network reduction" value={formatPercent(stats.networkReductionRate)} />
          <MetricRow label="Memory hits" value={String(stats.memoryHits)} />
          <MetricRow label="Storage hits" value={String(stats.storageHits)} />
          <MetricRow label="Network fetches" value={String(stats.networkFetches)} />
          <MetricRow label="Revalidations" value={String(stats.backgroundRevalidations)} />
          <MetricRow label="Invalidations" value={String(stats.invalidations)} />
          <MetricRow label="Entries" value={String(stats.entryCount)} />
          <MetricRow label="Memory size" value={formatBytes(stats.sizeBytes)} />
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
  <View className="flex-row justify-between py-0.5">
    <Text className="text-xs text-white/60">{label}</Text>
    <Text className="text-xs font-medium text-white">{value}</Text>
  </View>
);

export default CacheStatusOverlay;
