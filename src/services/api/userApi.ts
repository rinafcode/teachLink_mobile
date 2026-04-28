import { User } from "../../store";
import apiClient from "./axios.config";
import { fetchWithSWR, invalidateCache } from "./cache";

const userKey = (id: string) => `users:${id}`;

// 5 min fresh, 15 min stale window
const TTL = 5 * 60_000;
const STALE_TTL = 15 * 60_000;

export const userApi = {
  getUser(id: string): Promise<User> {
    return fetchWithSWR(
      userKey(id),
      () => apiClient.get<User>(`/users/${id}`).then((r) => r.data),
      TTL,
      STALE_TTL,
    );
  },

  invalidateUser(id: string): void {
    invalidateCache(userKey(id));
  },
};
