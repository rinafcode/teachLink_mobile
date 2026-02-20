import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

interface MemoryMonitorOptions {
    componentId: string;
    itemCount?: number;
    thresholdWarning?: number; // Number of items considered large
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
}: MemoryMonitorOptions) {
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;

        // Warn if a large list is rendered, especially on Android where memory limits
        // can be stricter. This is a proxy warning.
        if (itemCount > thresholdWarning) {
            console.warn(
                `[Memory Monitor] ${componentId}: Rendering ${itemCount} items. ` +
                `Ensure VirtualList/FlatList is used with appropriate windowSize ` +
                `to prevent excessive memory consumption.`
            );
        }

        return () => {
            isMounted.current = false;
        };
    }, [componentId, itemCount, thresholdWarning]);

    // If you added a native module for actual memory tracking (e.g. react-native-device-info),
    // you would poll getUsedMemory() here and trigger alerts.
    useEffect(() => {
        if (Platform.OS === 'android') {
            // Android specific memory optimization hints
            // This is a placeholder for potential Native Module calls if added later
        }
    }, []);
}
