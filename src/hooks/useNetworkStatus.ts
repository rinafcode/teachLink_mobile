import { useState, useEffect } from 'react';

export type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: ConnectionType;
}

export function useNetworkStatus() {
  return {
    networkStatus: { isConnected: true, isInternetReachable: true, type: 'unknown' as ConnectionType },
    isOnline: true,
    isOffline: false,
    isFastConnection: true,
    isChecking: false,
    refresh: async () => ({ isConnected: true, isInternetReachable: true, type: 'unknown' as ConnectionType }),
  };
}

export function useOnlineStatus() {
  return {
    isOnline: true,
    isOffline: false,
    refresh: async () => {},
  };
}

export function useConnectionQuality() {
  return {
    connectionType: 'unknown' as ConnectionType,
    isFastConnection: true,
    refresh: async () => {},
  };
}

export default useNetworkStatus;