import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { useDebounce } from './useDebounce';
import { FilterValues } from '../components/mobile/FilterSheet';
import { SearchResultItem } from '../components/mobile/SearchResultCard';
import { courseApi } from '../services/api/courseApi';
import { searchIndexService } from '../services/searchIndex';
import { appLogger } from '../utils/logger';

export interface UseSearchIndexOptions {
  /** Query to debounce and search against the already-mounted index. */
  query?: string;
  /** Search filters applied to the debounced query. */
  filters?: FilterValues;
  /** Debounce delay for query-driven searches. */
  debounceMs?: number;
}

export interface UseSearchIndexResult {
  /** Run a search and return ranked results. Instant (<100 ms) once ready. */
  search: (query: string, filters?: FilterValues) => SearchResultItem[];
  /** Results for the optional debounced query passed into the hook. */
  results: SearchResultItem[];
  /** Debounced query value used to compute `results`. */
  debouncedQuery: string;
  /** True while the raw query is waiting for the debounce window. */
  isSearching: boolean;
  /** Title words / phrases suitable for autocomplete Trie seeding. */
  suggestions: string[];
  /** True when the index is loaded and ready to query. */
  isReady: boolean;
  /** Number of courses indexed. */
  indexedCount: number;
  /** Force a full rebuild from the API (e.g. after a data change). */
  rebuild: () => Promise<void>;
}

/**
 * Manages the offline search index lifecycle.
 *
 * On first mount it loads any persisted index from AsyncStorage (fast path).
 * If nothing is persisted it fetches courses from the API and builds the index.
 * Subsequent mounts reuse the in-memory singleton — no rebuild needed.
 */
export function useSearchIndex(options: UseSearchIndexOptions = {}): UseSearchIndexResult {
  const { query = '', filters = {}, debounceMs = 300 } = options;
  const [isReady, setIsReady] = useState(searchIndexService.ready);
  const [suggestions, setSuggestions] = useState<string[]>(searchIndexService.getSuggestions());
  const [indexedCount, setIndexedCount] = useState(searchIndexService.indexedCount);
  const mounted = useRef(true);
  const debouncedQuery = useDebounce(query, debounceMs);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const sync = useCallback(() => {
    if (!mounted.current) return;
    setIsReady(searchIndexService.ready);
    setSuggestions(searchIndexService.getSuggestions());
    setIndexedCount(searchIndexService.indexedCount);
  }, []);

  const rebuild = useCallback(async () => {
    try {
      const courses = await courseApi.getCourses();
      await searchIndexService.buildFromCourses(courses);
      sync();
    } catch (e) {
      appLogger.errorSync('[useSearchIndex] rebuild failed', e as Error);
    }
  }, [sync]);

  useEffect(() => {
    mounted.current = true;

    async function init() {
      // Load persisted index (no-op if already in memory).
      await searchIndexService.initialize();

      if (!mounted.current) return;

      if (searchIndexService.ready) {
        sync();
      } else {
        // No persisted index found — build from API.
        await rebuild();
      }
    }

    init();
    return () => {
      mounted.current = false;
    };
  }, [rebuild, sync]);

  const search = useCallback(
    (query: string, filters?: FilterValues) => searchIndexService.search(query, filters),
    []
  );

  const results = useMemo(() => {
    const trimmed = deferredQuery.trim();
    if (!trimmed || !isReady) return [];
    return searchIndexService.search(trimmed, filters);
    // filtersKey intentionally re-runs the memo when callers provide a new
    // object with equivalent values but a different reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQuery, filtersKey, isReady]);

  return {
    search,
    results,
    debouncedQuery,
    isSearching: query !== debouncedQuery,
    suggestions,
    isReady,
    indexedCount,
    rebuild,
  };
}
