import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  SNAPSHOT_KEY,
  clearSnapshot,
  loadSnapshot,
  saveSnapshot,
} from '../../../services/searchIndex/persistence';
import { INDEX_VERSION, IndexSnapshot } from '../../../services/searchIndex/types';

const setItem = AsyncStorage.setItem as jest.Mock;
const getItem = AsyncStorage.getItem as jest.Mock;
const removeItem = AsyncStorage.removeItem as jest.Mock;

function withInMemoryStore() {
  const store = new Map<string, string>();
  setItem.mockImplementation((k: string, v: string) => {
    store.set(k, v);
    return Promise.resolve();
  });
  getItem.mockImplementation((k: string) => Promise.resolve(store.get(k) ?? null));
  removeItem.mockImplementation((k: string) => {
    store.delete(k);
    return Promise.resolve();
  });
  return store;
}

function snapshot(docs: IndexSnapshot['docs'] = []): IndexSnapshot {
  return {
    version: INDEX_VERSION,
    hash: 'h1',
    builtAt: Date.now(),
    docs,
  };
}

describe('searchIndex/persistence', () => {
  beforeEach(() => {
    setItem.mockReset();
    getItem.mockReset();
    removeItem.mockReset();
  });

  it('round-trips a snapshot through AsyncStorage', async () => {
    withInMemoryStore();
    const snap = snapshot([
      { id: '1', type: 'course', fields: { title: 'Alpha' } },
      { id: '2', type: 'course', fields: { title: 'Beta' } },
    ]);
    const ok = await saveSnapshot(snap);
    expect(ok).toBe(true);

    const loaded = await loadSnapshot();
    expect(loaded).not.toBeNull();
    expect(loaded?.docs).toHaveLength(2);
    expect(loaded?.docs[0].fields.title).toBe('Alpha');
  });

  it('returns null when no snapshot is stored', async () => {
    getItem.mockResolvedValueOnce(null);
    const loaded = await loadSnapshot();
    expect(loaded).toBeNull();
  });

  it('returns null when stored payload is corrupt', async () => {
    getItem.mockResolvedValueOnce('{not json');
    const loaded = await loadSnapshot();
    expect(loaded).toBeNull();
  });

  it('returns null when version is mismatched', async () => {
    getItem.mockResolvedValueOnce(
      JSON.stringify({ version: 999, hash: 'x', builtAt: 0, docs: [] })
    );
    const loaded = await loadSnapshot();
    expect(loaded).toBeNull();
  });

  it('skips persistence when payload exceeds size cap', async () => {
    withInMemoryStore();
    const huge = 'x'.repeat(50_000);
    const docs: IndexSnapshot['docs'] = [];
    for (let i = 0; i < 10; i++) {
      docs.push({ id: `d${i}`, type: 'course', fields: { title: huge, body: huge } });
    }
    const ok = await saveSnapshot(snapshot(docs));
    expect(ok).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('clearSnapshot removes the stored entry', async () => {
    const store = withInMemoryStore();
    store.set(SNAPSHOT_KEY, '{"version":1}');
    await clearSnapshot();
    expect(removeItem).toHaveBeenCalledWith(SNAPSHOT_KEY);
  });
});
