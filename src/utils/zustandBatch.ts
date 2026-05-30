// React Native environment typically provides unstable_batchedUpdates via react-native.
// In case typings are unavailable, we fall back to the global React batching.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unstable_batchedUpdates: ((fn: () => void) => void) | undefined = (globalThis as any)
  ?.unstable_batchedUpdates;

/**
 * Batch multiple Zustand `setState` calls (or any state work) into a single
 * React render pass.
 *
 * Usage:
 * ```ts
 * import { batch } from '@/utils/zustandBatch';
 *
 * batch(() => {
 *   store.getState().setName('...');
 *   store.getState().setAvatar('...');
 * });
 * ```
 *
 * Why:
 * React Native can still schedule multiple renders if updates happen in
 * separate ticks / microtasks. `unstable_batchedUpdates` forces them to land
 * together.
 */
export function batch(fn: () => void): void {
  if (typeof unstable_batchedUpdates === 'function') {
    unstable_batchedUpdates(fn);
    return;
  }

  // Fallback: single execution (best-effort). Zustand often batches sync calls
  // even without unstable_batchedUpdates.
  fn();
}


