/**
 * Hook for Location Management with Graceful Degradation & Batching
 *
 * Usage:
 * const { position, location, manualLocation, setManualLocation, loading, isDegraded, statusMessage, refresh, queryNearby } = useLocation();
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import locationService, { 
  LocationData, 
  LocationSourceType, 
  GetPositionOptions, 
  Position 
} from '../services/locationService'; // Standardized service import target
import { useDegradationStore } from '../store/degradationStore';
import { Coordinates, LocationPrecision } from '../utils/geoUtils';
import { appLogger } from '../utils/logger';

interface UseLocationReturn {
  /** Native geographic position details (lat, lng, timestamp) */
  position: Position | null;
  /** High-level location metadata (from GPS, cache, or manual entry) */
  location: LocationData | null;
  /** Manually entered location string */
  manualLocation: string;
  /** Set manual location string */
  setManualLocation: (address: string) => void;
  /** Whether location fetch is in progress */
  loading: boolean;
  /** Unexpected runtime errors */
  error: unknown | null;
  /** Whether location feature is degraded (no GPS / using fallback) */
  isDegraded: boolean;
  /** Human-friendly status message */
  statusMessage: string;
  /** Request location permission */
  requestPermission: () => Promise<boolean>;
  /** Refresh current location with optional performance overrides */
  refresh: (overrides?: GetPositionOptions) => Promise<Position | null>;
  /** Clear cached location tracking data */
  clearCachedLocation: () => void;
  /** Run a location-keyed backend query, automatically batched with nearby queries */
  queryNearby: <T>(
    coords: Coordinates,
    query: (c: Coordinates) => Promise<T>,
    precision?: LocationPrecision
  ) => Promise<T>;
}

export const useLocation = (defaultOptions: GetPositionOptions = {}): UseLocationReturn => {
  const [position, setPosition] = useState<Position | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [manualLocation, setManualLocationState] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown | null>(null);
  const [isDegraded, setIsDegraded] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const degradationStore = useDegradationStore();
  
  // Safe persistence for configuration changes across renders without re-triggering hooks
  const optionsRef = useRef(defaultOptions);
  useEffect(() => {
    optionsRef.current = defaultOptions;
  }, [defaultOptions]);

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await locationService.requestPermission();
    if (granted) {
      setIsDegraded(false);
      setStatusMessage('Location permission granted');
    } else {
      setIsDegraded(true);
      setStatusMessage('Location permission denied - manual entry available');
    }
    return granted;
  }, []);

  /**
   * Refresh current location with performance options and fallback chain
   */
  const refresh = useCallback(async (overrides?: GetPositionOptions): Promise<Position | null> => {
    setLoading(true);
    setError(null);
    try {
      appLogger.infoSync('[useLocation] Refreshing location position mapping');
      
      // Fetch underlying position using main-branch configuration merges
      const nativePosition = await locationService.getCurrentPosition({
        ...optionsRef.current,
        ...overrides,
      });
      setPosition(nativePosition);

      // Pass down parameters to downstream graceful degradation engines
      const locationData = await locationService.getLocationWithFallback(manualLocation);

      if (locationData) {
        setLocation(locationData);
        setStatusMessage(locationService.getStatusMessage(locationData));

        if (locationData.source === LocationSourceType.MANUAL && locationData.address) {
          setManualLocationState(locationData.address);
        }

        const degradedMode = locationData.source !== LocationSourceType.GPS;
        setIsDegraded(degradedMode);
        degradationStore.setFeatureStatus('location', degradedMode ? 'degraded' : 'available');
      } else {
        setLocation(null);
        setIsDegraded(true);
        setStatusMessage('Please enter your location manually');
      }

      return nativePosition;
    } catch (err) {
      appLogger.errorSync('[useLocation] Error refreshing location', err instanceof Error ? err : new Error(String(err)));
      setError(err);
      setIsDegraded(true);
      setStatusMessage('Location refresh failed - please enter manually');
      degradationStore.setFeatureStatus('location', 'degraded');
      return null;
    } finally {
      setLoading(false);
    }
  }, [manualLocation, degradationStore]);

  /**
   * Set manual location
   */
  const handleSetManualLocation = useCallback((address: string): void => {
    if (address.trim()) {
      const locationData = locationService.setManualLocation(address);
      setLocation(locationData);
      setManualLocationState(address);
      setStatusMessage(`Location saved: ${address}`);
      setIsDegraded(true); // Manual fallback triggers a degraded state marker
      degradationStore.setFeatureStatus('location', 'degraded');
      appLogger.infoSync('[useLocation] Manual location set', { address });
    }
  }, [degradationStore]);

  /**
   * Clear cached location
   */
  const clearCachedLocation = useCallback((): void => {
    locationService.clearCachedLocation();
    setLocation(null);
    setPosition(null);
    setManualLocationState('');
    setStatusMessage('Location cleared');
    appLogger.infoSync('[useLocation] Location cleared');
  }, []);

  /**
   * Run a location-keyed backend query, automatically batched with other
   * nearby queries (same precision cell) issued in the same window.
   */
  const queryNearby = useCallback(
    <T,>(
      coords: Coordinates,
      query: (c: Coordinates) => Promise<T>,
      precision: LocationPrecision = 'coarse',
    ) => locationService.batchNearbyQuery(coords, query, precision),
    [],
  );

  /**
   * Hydrate local system, check permission, and attempt to resolve location on mount
   */
  useEffect(() => {
    const initLocation = async () => {
      // Main branch hydration sequence
      await locationService.hydrate();

      const hasPermission = await locationService.checkPermission();
      if (hasPermission) {
        await refresh();
      } else {
        setIsDegraded(true);
        setStatusMessage('Location permission required - manual entry available');
        degradationStore.setFeatureStatus('location', 'degraded');
      }
    };

    initLocation();
  }, []);

  return {
    position,
    location,
    manualLocation,
    setManualLocation: handleSetManualLocation,
    loading,
    error,
    isDegraded,
    statusMessage,
    requestPermission,
    refresh,
    clearCachedLocation,
    queryNearby,
  };
};

export default useLocation;