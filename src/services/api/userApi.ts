import { User } from '../../store';
import { UserSchema } from '../../types/api/schemas';
import { batchClient } from './batchClient';
import { fetchWithSWR, invalidateCacheByTags } from './cache';
import { validateResponse } from './validation';

const userKey = (id: string) => `users:${id}`;
const USER_TAG = 'users';
const userTag = (id: string) => `user:${id}`;

// 5 min fresh, 15 min stale window
const TTL = 5 * 60_000;
const STALE_TTL = 15 * 60_000;

export const userApi = {
  async getUser(id: string): Promise<User> {
    const response = await fetchWithSWR(userKey(id), () => batchClient.get(`/users/${id}`), TTL, STALE_TTL, {
      dataType: 'user-profile',
      tags: [USER_TAG, userTag(id)],
      critical: true,
    });
    return validateResponse(UserSchema, response, { api: 'getUser', id });
  },

  invalidateUser(id: string): void {
    invalidateCacheByTags([USER_TAG, userTag(id)]);
  },
};