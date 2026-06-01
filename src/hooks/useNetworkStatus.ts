import { useState, useEffect, useCallback } from 'react';
import { Network } from 'expo-network';

export type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: ConnectionType;
}

export interface ConnectionQuality {
  quality: 'slow-3g' | 'fast-3g' | '4g' | '5g' | 'wifi' | 'unknown';
  isFast: boolean;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
  });
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    quality: 'unknown',
    isFast: false,
  });
  const [isChecking, setIsChecking] = useState(false);

  const fetchNetworkState = useCallback(async () => {
    setIsChecking(true);
    try {
      const networkState = await Network.getNetworkStateAsync();
      
      // Update network status
      setNetworkStatus({
        isConnected: networkState.isConnected,
        isInternetReachable: networkState.isInternetReachable ?? true, // Assume true if not provided
        type: networkState.type,
      });

      // Determine connection quality
      let quality: ConnectionQuality['quality'] = 'unknown';
      let isFast = false;

      if (!networkState.isConnected) {
        quality = 'unknown';
        isFast = false;
      } else if (networkState.type === 'wifi') {
        quality = 'wifi';
        isFast = true;
      } else if (networkState.type === 'cellular') {
        try {
          const cellularState = await Network.getCellularStateAsync();
          const generation = cellularState.cellularGeneration;
          const signalStrength = cellularState.signalStrength ?? 0; // 0-100

          if (generation === '5g') {
            quality = '5g';
            isFast = true;
          } else if (generation === '4g') {
            quality = '4g';
            isFast = true;
          } else if (generation === '3g') {
            // Consider 3G with signal strength >= 50 as fast-3G
            if (signalStrength >= 50) {
              quality = 'fast-3g';
              isFast = true;
            } else {
              quality = 'slow-3g';
              isFast = false;
            }
          } else {
            // 2g or unknown generation
            quality = 'slow-3g';
            isFast = false;
          }
        } catch (error) {
          console.warn('Failed to get cellular state', error);
          // Fallback to treating cellular as unknown quality
          quality = 'unknown';
          isFast = false;
        }
      } else {
        // unknown or none (but we already checked isConnected)
        quality = 'unknown';
        isFast = false;
      }

      setConnectionQuality({ quality, isFast });
    } catch (error) {
      console.warn('Failed to get network state', error);
      setNetworkStatus({
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
      });
      setConnectionQuality({
        quality: 'unknown',
        isFast: false,
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Fetch initial state
    fetchNetworkState();

    // Subscribe to network state changes
    const subscription = Network.addNetworkStateListener(fetchNetworkState);

    // Cleanup
    return () => {
      subscription.remove();
    };
  }, [fetchNetworkState]);

  const refresh = useCallback(async () => {
    await fetchNetworkState();
  }, [fetchNetworkState]);

  return {
    networkStatus,
    connectionQuality,
    isOnline: networkStatus.isConnected && networkStatus.isInternetReachable,
    isOffline: !(networkStatus.isConnected && networkStatus.isInternetReachable),
    isFastConnection: connectionQuality.isFast,
    isChecking,
    refresh,
  };
}

export function useOnlineStatus() {
  const { isOnline, isOffline, refresh } = useNetworkStatus();
  return {
    isOnline,
    isOffline,
    refresh,
  };
}

export function useConnectionQuality() {
  const { networkStatus, connectionQuality, refresh } = useNetworkStatus();
  return {
    connectionType: networkStatus.type,
    quality: connectionQuality.quality,
    isFastConnection: connectionQuality.isFast,
    refresh,
  };
}

export default useNetworkStatus;