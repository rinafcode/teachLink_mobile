import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  Coordinates,
  LocationPrecision,
  gridKey,
  isWithinPrecision,
  roundCoordinates,
} from '../utils/geoUtils';
import { logger } from '../utils/logger';

/**
 * Location data optimization service.
 *
 * Three battery/latency wins live here:
 *  1. Caching   - a recent fix is reused (in-memory + persisted) instead of
 *                 waking the GPS chip again.
 *  2. Precision - callers ask for `coarse` (~100m, network) or `fine` (~1m,
 *                 GPS), so the high-accuracy cost is only paid when needed.
 *  3. Batching  - location-keyed backend queries are collapsed per precision
 *                 cell and flushed together, so a burst of nearby requests
 *                 becomes a single call.
 *
 * The actual platform read is delegated to a {@link PositionReader} so the
 * service stays decoupled from the geolocation SDK (Expo Location by default).
 * See docs/location-strategy.md for the full rationale.
 */

export interface Position {
  coords: Coordinates & {
    accuracy?: number | null;
  };
  /** Epoch millis when the fix was obtained. */
  timestamp: number;
}

export interface GetPositionOptions {
  /** Desired accuracy tier. Defaults to `coarse` to preserve battery. */
  precision?: LocationPrecision;
  /** How long a cached fix stays valid, in ms. Defaults to 60s. */
  maxAgeMs?: number;
  /** Force a fresh read, bypassing the cache. */
  forceFresh?: boolean;
}

/** Reads a single position from the platform. */
export type PositionReader = (highAccuracy: boolean) => Promise<Position>;

/** A backend query keyed by location, resolved once its batch flushes. */
export type LocationQueryFn<T> = (coords: Coordinates) => Promise<T>;

const DEFAULT_MAX_AGE_MS = 60 * 1000;
const BATCH_WINDOW_MS = 50;
const CACHE_KEY = 'last_location_v1';

interface PendingBatchEntry<T = unknown> {
  coords: Coordinates;
  query: LocationQueryFn<T>;
  resolvers: ((value: T) => void)[];
  rejecters: ((reason: unknown) => void)[];
}

/**
 * Default reader backed by Expo Location, resolved lazily so the module loads
 * even in environments where `expo-location` is unavailable (it then rejects
 * with a clear error and callers can fall back).
 */
const expoPositionReader: PositionReader = async (highAccuracy) => {
  let ExpoLocation: typeof import('expo-location') | null = null;
  try {
     
    ExpoLocation = require('expo-location');
  } catch {
    throw new Error('expo-location is not available');
  }
  if (!ExpoLocation) throw new Error('expo-location is not available');

  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission not granted');
  }

  const result = await ExpoLocation.getCurrentPositionAsync({
    accuracy: highAccuracy
      ? ExpoLocation.Accuracy.Highest
      : ExpoLocation.Accuracy.Balanced,
  });

  return {
    coords: {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
      accuracy: result.coords.accuracy,
    },
    timestamp: result.timestamp ?? Date.now(),
  };
};

class LocationService {
  private reader: PositionReader;
  private lastPosition: Position | null = null;
  private inFlight: Promise<Position> | null = null;
  private hydrated = false;

  /** Queries waiting to be flushed, grouped by precision-cell key. */
  private batchBuckets: Map<string, PendingBatchEntry> = new Map();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(reader: PositionReader = expoPositionReader) {
    this.reader = reader;
  }

  /** Allow tests or alternate SDKs to inject a position reader. */
  setReader(reader: PositionReader): void {
    this.reader = reader;
  }

  /** Load the persisted last fix so the first request can often skip the GPS. */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        this.lastPosition = JSON.parse(raw) as Position;
      }
    } catch (error) {
      logger.warn('LocationService: failed to hydrate cached position', error);
    }
  }

  /**
   * Get the device position, reusing a cached fix when it is fresh enough and
   * within the requested precision radius. Returned coordinates are snapped to
   * the precision grid so downstream caching/batching stays stable.
   */
  async getCurrentPosition(options: GetPositionOptions = {}): Promise<Position> {
    const precision: LocationPrecision = options.precision ?? 'coarse';
    const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;

    if (!options.forceFresh && this.isCacheUsable(maxAgeMs)) {
      return this.snapPosition(this.lastPosition as Position, precision);
    }

    // Coalesce concurrent callers onto a single hardware read.
    if (!this.inFlight) {
      this.inFlight = this.readFromDevice(precision).finally(() => {
        this.inFlight = null;
      });
    }

    const fresh = await this.inFlight;
    return this.snapPosition(fresh, precision);
  }

  private isCacheUsable(maxAgeMs: number): boolean {
    if (!this.lastPosition) return false;
    return Date.now() - this.lastPosition.timestamp <= maxAgeMs;
  }

  private snapPosition(position: Position, precision: LocationPrecision): Position {
    const snapped = roundCoordinates(position.coords, precision);
    return {
      ...position,
      coords: { ...position.coords, ...snapped },
    };
  }

  private async readFromDevice(precision: LocationPrecision): Promise<Position> {
    try {
      const fresh = await this.reader(precision === 'fine');
      this.lastPosition = fresh;
      void this.persist(fresh);
      return fresh;
    } catch (error) {
      logger.warn('LocationService: device read failed', error);
      throw error;
    }
  }

  private async persist(position: Position): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(position));
    } catch (error) {
      logger.warn('LocationService: failed to persist position', error);
    }
  }

  /**
   * Run a location-keyed backend query, batching it with any other queries
   * that fall in the same precision cell within a short window. Requests that
   * share a cell run the supplied query exactly once and fan the result out to
   * every caller, eliminating duplicate round-trips for nearby users/screens.
   */
  batchNearbyQuery<T>(
    coords: Coordinates,
    query: LocationQueryFn<T>,
    precision: LocationPrecision = 'coarse',
  ): Promise<T> {
    const key = gridKey(coords, precision);

    return new Promise<T>((resolve, reject) => {
      const existing = this.batchBuckets.get(key) as PendingBatchEntry<T> | undefined;
      if (existing) {
        existing.resolvers.push(resolve);
        existing.rejecters.push(reject);
      } else {
        this.batchBuckets.set(key, {
          coords: roundCoordinates(coords, precision),
          query: query as LocationQueryFn<unknown>,
          resolvers: [resolve as (value: unknown) => void],
          rejecters: [reject],
        });
      }
      this.scheduleFlush();
    });
  }

  private scheduleFlush(): void {
    if (this.batchTimer) return;
    this.batchTimer = setTimeout(() => this.flushBatch(), BATCH_WINDOW_MS);
  }

  private flushBatch(): void {
    this.batchTimer = null;
    const buckets = Array.from(this.batchBuckets.values());
    this.batchBuckets.clear();

    buckets.forEach((bucket) => {
      bucket
        .query(bucket.coords)
        .then((result) => bucket.resolvers.forEach((r) => r(result)))
        .catch((err) => bucket.rejecters.forEach((r) => r(err)));
    });
  }

  /** Most recent fix, if any (unrounded). Useful for diagnostics. */
  getLastPosition(): Position | null {
    return this.lastPosition;
  }

  /** Drop the cached fix and any queued batches. */
  async reset(): Promise<void> {
    this.lastPosition = null;
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.batchBuckets.clear();
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
      logger.warn('LocationService: failed to clear cached position', error);
    }
  }
}

export const locationService = new LocationService();
export default locationService;
export { LocationService };
