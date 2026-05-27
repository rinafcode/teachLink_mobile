import AsyncStorage from '@react-native-async-storage/async-storage';

import { INDEX_VERSION, IndexSnapshot } from './types';
import { appLogger } from '../../utils/logger';

export const SNAPSHOT_KEY = '@teachlink_search_index_v1';
const MAX_PAYLOAD_BYTES = 200 * 1024;

export async function loadSnapshot(): Promise<IndexSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IndexSnapshot;
    if (!parsed || parsed.version !== INDEX_VERSION || !Array.isArray(parsed.docs)) {
      return null;
    }
    return parsed;
  } catch (err) {
    appLogger.error('searchIndex: failed to load snapshot', err);
    return null;
  }
}

/**
 * Save a snapshot. If the serialized payload exceeds MAX_PAYLOAD_BYTES, persist
 * a doc-only snapshot (postings rebuilt on hydrate). Returns true on success.
 */
export async function saveSnapshot(snapshot: IndexSnapshot): Promise<boolean> {
  try {
    const stripped: IndexSnapshot = {
      version: snapshot.version,
      hash: snapshot.hash,
      builtAt: snapshot.builtAt,
      docs: snapshot.docs,
    };
    const payload = JSON.stringify(stripped);
    if (payload.length > MAX_PAYLOAD_BYTES) {
      appLogger.warn(
        `searchIndex: snapshot ${payload.length}B exceeds cap ${MAX_PAYLOAD_BYTES}B; skipping persistence`
      );
      return false;
    }
    await AsyncStorage.setItem(SNAPSHOT_KEY, payload);
    return true;
  } catch (err) {
    appLogger.error('searchIndex: failed to save snapshot', err);
    return false;
  }
}

export async function clearSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SNAPSHOT_KEY);
  } catch (err) {
    appLogger.error('searchIndex: failed to clear snapshot', err);
  }
}
