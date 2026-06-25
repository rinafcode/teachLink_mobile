import { useCallback, useEffect, useRef, useState } from 'react';

import { FilterValues } from '../components/mobile/FilterSheet';
import { SearchResultItem } from '../components/mobile/SearchResultCard';
import { courseApi } from '../services/api/courseApi';
import { searchIndexService } from '../services/searchIndex';
import { appLogger } from '../utils/logger';

export interface UseSearchIndexResult {
  /** Run a search and return ranked results. Instant (<100 ms) once ready. */
  search: (query: string, filters?: FilterValues) => SearchResultItem[];
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
export function useSearchIndex(): UseSearchIndexResult {
  const [isReady, setIsReady] = useState(searchIndexService.ready);
  const [suggestions, setSuggestions] = useState<string[]>(
    searchIndexService.getSuggestions(),
  );
  const [indexedCount, setIndexedCount] = useState(searchIndexService.indexedCount);
  const mounted = useRef(true);

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
    (query: string, filters?: FilterValues) =>
      searchIndexService.search(query, filters),
    [],
  );

  return { search, suggestions, isReady, indexedCount, rebuild };
}
