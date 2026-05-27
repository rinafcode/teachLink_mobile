import { useContext } from 'react';

import { SearchIndexContext, SearchIndexContextValue } from '../components/SearchIndexProvider';

export function useSearchIndex(): SearchIndexContextValue {
  const ctx = useContext(SearchIndexContext);
  if (!ctx) {
    return {
      ready: false,
      size: 0,
      search: () => [],
      rebuild: async () => {},
    };
  }
  return ctx;
}
