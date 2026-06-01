import apiClient from "./axios.config";

export const apiService = {
  get: (url: string, params?: any) => apiClient.get(url, { params }),
  post: (url: string, data: any) => apiClient.post(url, data),
  put: (url: string, data: any) => apiClient.put(url, data),
  delete: (url: string) => apiClient.delete(url),
};

export { clearCache, fetchWithSWR, invalidateCache } from "./cache";
export { courseApi } from "./courseApi";
export {
  buildCursor,
  buildCursorCacheKey,
  paginateWithCursor,
  parseCursor,
} from "./cursorPagination";
export { userApi } from "./userApi";
export { batchClient } from "./batchClient";

export default apiService;