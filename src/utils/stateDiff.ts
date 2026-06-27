/**
 * Efficient diffing utility to reduce object churn during state updates.
 * Compares deeply nested objects and returns only the modified fields.
 * This prevents unnecessary memory allocations and reduces GC pause times.
 * 
 * @param oldState - The existing state object.
 * @param newState - The incoming partial state object to merge.
 * @returns A partial object containing only the patched keys, or `null` if identical.
 */
export function shallowDiff<T extends Record<string, any>>(
  oldState: T,
  newState: Partial<T>
): Partial<T> | null {
  if (oldState === newState) return null;
  if (!oldState || !newState) return newState;

  let hasChanges = false;
  const diff: Partial<T> = {};

  for (const key in newState) {
    if (Object.prototype.hasOwnProperty.call(newState, key)) {
      const oldVal = oldState[key];
      const newVal = newState[key];

      if (oldVal === newVal) continue;

      if (
        oldVal !== null &&
        newVal !== null &&
        typeof oldVal === 'object' &&
        typeof newVal === 'object' &&
        !Array.isArray(oldVal) &&
        !Array.isArray(newVal)
      ) {
        const nestedDiff = shallowDiff(oldVal, newVal);
        if (nestedDiff !== null) {
          // Keep the unchanged properties of the nested object, apply the diff
          diff[key] = { ...oldVal, ...nestedDiff } as any;
          hasChanges = true;
        }
      } else {
        diff[key] = newVal;
        hasChanges = true;
      }
    }
  }

  return hasChanges ? diff : null;
}
