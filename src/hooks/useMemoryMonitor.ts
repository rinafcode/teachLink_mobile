import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import logger from '../utils/logger';

interface MemoryMonitorOptions {
    componentId: string;
    itemCount?: number;
    thresholdWarning?: number; // Number of items considered large
    thresholdCritical?: number; // Number of items considered critical
}

interface MemoryMonitorResult {
    isHighMemory: boolean;
    isCriticalMemory: boolean;
}

/**
 * A hook to monitor component rendering and provide warnings when lists grow too large,
 * potentially causing memory spikes. True JS heap memory tracking is limited without
 * native modules, so this proxy tracks render lifecycle and item counts.
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

        return () => {
            isMounted.current = false;
        };
    }, [componentId, itemCount, thresholdWarning, thresholdCritical]);

    useEffect(() => {
        if (Platform.OS === 'android' && itemCount > thresholdWarning) {
            logger.debug(
                `[Memory Monitor] ${componentId}: Android memory hint — consider reducing windowSize on FlatList.`
            );
        }
    }, [componentId, itemCount, thresholdWarning]);

    return { isHighMemory, isCriticalMemory };
}
