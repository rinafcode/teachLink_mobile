import { useCallback, useEffect, useRef, useState } from 'react';

import locationService, { GetPositionOptions, Position } from '../services/location';
import { Coordinates, LocationPrecision } from '../utils/geoUtils';

interface UseLocationState {
  position: Position | null;
  loading: boolean;
  error: unknown | null;
}

/**
 * React wrapper around the location service.
 *
 * Defaults to `coarse` precision to favour battery life; pass
 * `{ precision: 'fine' }` only for flows that genuinely need ~1m accuracy.
 * Reads are cached/coalesced by the service, so calling `refresh` from many
 * components is cheap. Location-keyed backend queries can be batched with
 * `queryNearby`.
 */
export function useLocation(defaultOptions: GetPositionOptions = {}) {
  const [state, setState] = useState<UseLocationState>({
    position: null,
    loading: false,
    error: null,
  });
  const optionsRef = useRef(defaultOptions);
  optionsRef.current = defaultOptions;

  useEffect(() => {
    void locationService.hydrate();
  }, []);

  const refresh = useCallback(async (overrides?: GetPositionOptions) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const position = await locationService.getCurrentPosition({
        ...optionsRef.current,
        ...overrides,
      });
      setState({ position, loading: false, error: null });
      return position;
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error }));
      return null;
    }
  }, []);

  /**
   * Run a location-keyed backend query, automatically batched with other
   * nearby queries (same precision cell) issued in the same window.
   */
  const queryNearby = useCallback(
    <T>(
      coords: Coordinates,
      query: (c: Coordinates) => Promise<T>,
      precision: LocationPrecision = 'coarse',
    ) => locationService.batchNearbyQuery(coords, query, precision),
    [],
  );

  return {
    ...state,
    refresh,
    queryNearby,
  };
}

export default useLocation;
