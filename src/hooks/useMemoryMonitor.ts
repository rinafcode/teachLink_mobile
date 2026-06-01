import { useEffect, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import logger from '../utils/logger';
import {
  captureMemorySnapshot,
  detectLeak,
  formatBytes,
  MemorySnapshot,
} from '../utils/memoryProfiler';
import { mobileAnalyticsService } from '../services/mobileAnalytics';
import { AnalyticsEvent } from '../utils/trackingEvents';

interface MemoryMonitorOptions {
  componentId: string;
  itemCount?: number;
  thresholdWarning?: number; // Number of items considered large
  thresholdCritical?: number; // Number of items considered critical
}

interface MemoryMonitorResult {
  isHighMemory: boolean;
  isCriticalMemory: boolean;
  heapUsedBytes: number;
  isLeakSuspected: boolean;
}

/**
 * A hook to monitor component rendering and provide warnings when lists grow too large,
 * potentially causing memory spikes. Tracks Hermes GC/heap stats, detects leak patterns,
 * warns when memory exceeds 80% of available RAM, and triggers garbage collection.
 */
export function useMemoryMonitor({
  componentId,
  itemCount = 0,
  thresholdWarning = 100,
  thresholdCritical = 500,
}: MemoryMonitorOptions): MemoryMonitorResult {
  const isMounted = useRef(false);
  const [isHighMemory, setIsHighMemory] = useState(false);
  const [isCriticalMemory, setIsCriticalMemory] = useState(false);
  const [heapUsedBytes, setHeapUsedBytes] = useState(0);
  const [isLeakSuspected, setIsLeakSuspected] = useState(false);

  const snapshotsRef = useRef<MemorySnapshot[]>([]);

  const logMemorySnapshot = (pointName: string, snapshot: MemorySnapshot) => {
    if (snapshot.available) {
      logger.info(
        `[Memory Monitor] ${componentId} Snapshot [${pointName}]: ` +
          `Used Heap: ${formatBytes(snapshot.usedHeapBytes)} / ` +
          `Total Heap: ${formatBytes(snapshot.heapSizeBytes)}`
      );
    } else {
      logger.debug(
        `[Memory Monitor] ${componentId} Snapshot [${pointName}]: Hermes stats unavailable`
      );
    }
  };

  const performCheckRef = useRef<(trigger: string) => void>(() => {});
  performCheckRef.current = (trigger: string) => {
    if (!isMounted.current) return;

    const snapshot = captureMemorySnapshot();
    setHeapUsedBytes(snapshot.usedHeapBytes);

    if (!snapshot.available) {
      return;
    }

    // Add to history and keep last 20 snapshots
    const history = [...snapshotsRef.current, snapshot].slice(-20);
    snapshotsRef.current = history;

    logMemorySnapshot(trigger, snapshot);

    // Leak detection (sustained monotonic growth)
    const suspected = detectLeak(history);
    if (suspected !== isLeakSuspected) {
      setIsLeakSuspected(suspected);
    }

    if (suspected) {
      logger.warn(
        `[Memory Monitor] Component ${componentId} detected potential memory leak: ` +
          `heap size has increased monotonically over ${history.length} samples.`
      );
      logMemorySnapshot('Leak Warning Point', snapshot);

      // Send metric to analytics
      mobileAnalyticsService.trackEvent(AnalyticsEvent.PERFORMANCE_METRIC, {
        metric: 'memory_leak_suspected',
        componentId,
        usedHeapBytes: snapshot.usedHeapBytes,
      });

      // Trigger garbage collection
      if (typeof global.gc === 'function') {
        logger.info(
          `[Memory Monitor] ${componentId}: Triggering garbage collection due to suspected leak`
        );
        global.gc();
      }
    }

    // Available memory alert (>80% threshold)
    const maxMemory = Device.totalMemory;
    if (maxMemory && maxMemory > 0 && snapshot.usedHeapBytes > 0.8 * maxMemory) {
      logger.error(
        `[Memory Monitor] ${componentId}: APPROACHING DEVICE LIMIT! ` +
          `Used Memory: ${formatBytes(snapshot.usedHeapBytes)} (>80% of ${formatBytes(maxMemory)}).`
      );
      logMemorySnapshot('Threshold Alert Point', snapshot);

      Alert.alert(
        'Memory Warning',
        `[Memory Monitor] Component ${componentId} memory usage is critical: ` +
          `${formatBytes(snapshot.usedHeapBytes)} exceeds 80% of device memory (${formatBytes(maxMemory)}).`
      );

      // Send metric to analytics
      mobileAnalyticsService.trackEvent(AnalyticsEvent.PERFORMANCE_METRIC, {
        metric: 'high_memory_alert',
        componentId,
        usedHeapBytes: snapshot.usedHeapBytes,
        totalMemory: maxMemory,
      });

      // Trigger garbage collection
      if (typeof global.gc === 'function') {
        logger.info(
          `[Memory Monitor] ${componentId}: Triggering garbage collection due to limit warning`
        );
        global.gc();
      }
    }
  };

  const hasMountedRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    const high = itemCount > thresholdWarning;
    const critical = itemCount > thresholdCritical;

    setIsHighMemory(high);
    setIsCriticalMemory(critical);

    if (critical) {
      logger.warn(
        `[Memory Monitor] ${componentId}: CRITICAL — ${itemCount} items rendered. ` +
          `This may cause significant memory pressure. Consider pagination or infinite scroll.`
      );
    } else if (high) {
      logger.warn(
        `[Memory Monitor] ${componentId}: Rendering ${itemCount} items. ` +
          `Ensure VirtualList/FlatList is used with appropriate windowSize ` +
          `to prevent excessive memory consumption.`
      );
    }

    if (hasMountedRef.current) {
      performCheckRef.current('Update');
    } else {
      hasMountedRef.current = true;
      performCheckRef.current('Mount');
    }

    return () => {
      isMounted.current = false;
    };
  }, [componentId, itemCount, thresholdWarning, thresholdCritical]);

  useEffect(() => {
    // Interval checks (every 5 seconds)
    const intervalId = setInterval(() => {
      performCheckRef.current('Interval');
    }, 5000);

    return () => {
      clearInterval(intervalId);
      const final = captureMemorySnapshot();
      logMemorySnapshot('Unmount', final);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && itemCount > thresholdWarning) {
      logger.debug(
        `[Memory Monitor] ${componentId}: Android memory hint — consider reducing windowSize on FlatList.`
      );
    }
  }, [componentId, itemCount, thresholdWarning]);

  return { isHighMemory, isCriticalMemory, heapUsedBytes, isLeakSuspected };
}
