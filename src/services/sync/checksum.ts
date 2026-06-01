/**
 * Lightweight checksum utility for the sync system.
 *
 * Uses a djb2-style hash over a stable JSON serialization of the data object.
 * This is fast and collision-resistant enough for change detection, but it is
 * not a cryptographic hash.
 */

export function checksum(data: unknown): string {
  const str = stableStringify(data);
  let hash = 5381;

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash & hash;
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function checksumEqual(a: unknown, b: unknown): boolean {
  return checksum(a) === checksum(b);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'undefined';
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => `${JSON.stringify(key)}:${stableStringify(obj[key])}`);
  return `{${pairs.join(',')}}`;
}
