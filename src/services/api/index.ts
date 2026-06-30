import apiClient from './axios.config';
import { fetchWithSWR } from './cache';
import { requestDeduplicator } from './requestDeduplicator';
import { resolveEndpointTtl } from '../../config/apiCacheConfig';

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
    // Issue #597 — resolve the per-endpoint TTL (critical vs static), falling
    // back to the global default for unconfigured endpoints.
    const { ttl, staleTtl } = resolveEndpointTtl(url);
    return requestDeduplicator.deduplicate<T>({ method: 'GET', url, params }, () =>
      fetchWithSWR<T>(
        cacheKey,
        () => apiClient.get<T>(url, { params }).then(response => response.data as T),
        ttl,
        staleTtl,
        {
          dataType: 'api-read',
          tags: [buildResourceTag(url)],
          critical: ttl <= 30_000,
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
  invalidateByPattern,
  invalidateCacheByPrefix,
  invalidateCacheByTags,
  invalidateCacheForBatchRequests,
  invalidateCacheForMutation,
  invalidatePattern,
  resetCacheStats,
} from './cache';
export {
  DEFAULT_ENDPOINT_TTL,
  ENDPOINT_TTL_MAP,
  resolveEndpointTtl,
} from '../../config/apiCacheConfig';
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
