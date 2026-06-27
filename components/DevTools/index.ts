/**
 * DevTools barrel — Issue #378
 *
 * Conditionally re-exports development-only tooling. In production (`!__DEV__`)
 * each export resolves to a no-op `() => null` component and the real module is
 * never `require`d, so Metro keeps the implementation (and `react-native-svg`
 * usage, polling, etc.) out of the production bundle entirely.
 *
 * This is the safest Metro-compatible pattern for dev-only components: the gate
 * is a plain `if` on the `__DEV__` constant, which the bundler can fold.
 */
import type { ComponentType } from 'react';

const NullComponent: ComponentType = () => null;

const loadMemoryProfilerOverlay = (): ComponentType => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const overlayModule = require('./MemoryProfilerOverlay');
  return overlayModule?.default ?? NullComponent;
};

const loadCacheStatusOverlay = (): ComponentType => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const overlayModule = require('./CacheStatusOverlay');
  return overlayModule?.default ?? NullComponent;
};

export const MemoryProfilerOverlay: ComponentType = __DEV__
  ? loadMemoryProfilerOverlay()
  : NullComponent;

export const CacheStatusOverlay: ComponentType = __DEV__ ? loadCacheStatusOverlay() : NullComponent;
