import apiClient from './axios.config';
import { fetchWithSWR } from './cache';
import { requestDeduplicator } from './requestDeduplicator';

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_STALE_TTL_MS = 5 * 60_000;

function buildRequestCacheKey(url: string, params?: unknown): string {
  const serializedParams = params == null ? '' : JSON.stringify(params);
  return `api:${url}${serializedParams ? `:${serializedParams}` : ''}`;
}

function buildResourceTag(url: string): string {
  const normalized = url.replace(/^\/+/, '').replace(/^api\//, '');
  const [resource] = normalized.split('/').filter(Boolean);
  return resource ? `resource:${resource}` : 'resource:generic';
}

export const apiService = {
  /**
   * Issue #224 — GET requests are deduplicated: identical concurrent calls
   * share one in-flight Promise and only produce a single network request.
   */
  get: <T = unknown>(url: string, params?: any) => {
    const cacheKey = buildRequestCacheKey(url, params);
    return requestDeduplicator.deduplicate<T>({ method: 'GET', url, params }, () =>
      fetchWithSWR<T>(
        cacheKey,
        () => apiClient.get<T>(url, { params }).then(response => response.data as T),
        DEFAULT_TTL_MS,
        DEFAULT_STALE_TTL_MS,
        {
          dataType: 'api-read',
          tags: [buildResourceTag(url)],
          critical: false,
        }
      )
    );
  },
  post: (url: string, data: any) => apiClient.post(url, data),
  put: (url: string, data: any) => apiClient.put(url, data),
  delete: (url: string) => apiClient.delete(url),
};

export { default as apiClient } from './axios.config';
export { batchClient } from './batchClient';
export {
  clearCache,
  clearPersistentCache,
  fetchWithSWR,
  getCacheStats,
  getCacheStatus,
  getRevalidatingCacheKeys,
  invalidateCache,
  invalidateCacheByPrefix,
  invalidateCacheByTags,
  invalidateCacheForBatchRequests,
  invalidateCacheForMutation,
  resetCacheStats,
} from './cache';
export { courseApi } from './courseApi';
export {
  buildCursor,
  buildCursorCacheKey,
  paginateWithCursor,
  parseCursor,
} from './cursorPagination';
export { RequestDeduplicator, requestDeduplicator } from './requestDeduplicator';
export { userApi } from './userApi';

export default apiService;
