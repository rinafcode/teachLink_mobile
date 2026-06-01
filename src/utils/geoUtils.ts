/**
 * Pure geospatial helpers shared by the location service.
 *
 * Keeping these side-effect free makes the location-caching and
 * query-batching logic easy to reason about and reuse.
 */

/**
 * Location precision tiers.
 *
 * - `fine`   ~1m   accuracy. Uses the GPS chip (high power draw).
 * - `coarse` ~100m accuracy. Uses network/cell positioning (low power draw).
 *
 * Most discovery features (nearby courses, regional content) only need
 * `coarse`. Reserve `fine` for exact check-in / turn-by-turn flows.
 */
export type LocationPrecision = 'fine' | 'coarse';

/** Number of decimal degrees that roughly correspond to each precision tier. */
const PRECISION_DECIMALS: Record<LocationPrecision, number> = {
  // ~1m at the equator
  fine: 5,
  // ~100m at the equator
  coarse: 3,
};

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Snap a single coordinate value to the grid implied by the precision tier.
 * Rounding before caching/querying lets us treat physically-close requests as
 * identical, which is what makes deduping and batching effective.
 */
export function roundCoordinate(value: number, precision: LocationPrecision): number {
  const factor = Math.pow(10, PRECISION_DECIMALS[precision]);
  return Math.round(value * factor) / factor;
}

/**
 * Snap a coordinate pair to the precision grid.
 */
export function roundCoordinates(coords: Coordinates, precision: LocationPrecision): Coordinates {
  return {
    latitude: roundCoordinate(coords.latitude, precision),
    longitude: roundCoordinate(coords.longitude, precision),
  };
}

/**
 * Build a stable cache/dedup key for a coordinate pair at a given precision.
 * Two requests that land in the same precision cell share a key, so the
 * batcher can collapse them into a single backend query.
 */
export function gridKey(coords: Coordinates, precision: LocationPrecision): string {
  const decimals = PRECISION_DECIMALS[precision];
  const lat = coords.latitude.toFixed(decimals);
  const lng = coords.longitude.toFixed(decimals);
  return `${precision}:${lat},${lng}`;
}

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance between two points in meters (haversine formula).
 * Used to decide whether a freshly-read position is "close enough" to a
 * cached one to reuse it.
 */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The maximum drift (in meters) tolerated before a cached fix is considered stale. */
export const PRECISION_RADIUS_METERS: Record<LocationPrecision, number> = {
  fine: 5,
  coarse: 100,
};

/**
 * Whether a cached coordinate is still acceptable for a request at the given
 * precision, i.e. it has not drifted beyond that tier's radius.
 */
export function isWithinPrecision(
  cached: Coordinates,
  current: Coordinates,
  precision: LocationPrecision,
): boolean {
  return haversineDistance(cached, current) <= PRECISION_RADIUS_METERS[precision];
}
