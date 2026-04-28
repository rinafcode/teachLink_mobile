import apiClient from "./axios.config";

export const apiService = {
  // Example API methods
  get: (url: string, params?: any) => apiClient.get(url, { params }),
  post: (url: string, data: any) => apiClient.post(url, data),
  put: (url: string, data: any) => apiClient.put(url, data),
  delete: (url: string) => apiClient.delete(url),
};

export { courseApi } from "./courseApi";
export { userApi } from "./userApi";
export { fetchWithSWR, invalidateCache, clearCache } from "./cache";

export default apiService;
