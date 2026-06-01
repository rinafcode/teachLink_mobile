import { useAppStore } from '../store';
import { appLogger } from '../utils/logger';
import { courseApi } from './api/courseApi';
import { userApi } from './api/userApi';

/**
 * Warm critical caches in parallel during the splash screen so home screen
 * data is ready before the user sees it.
 *
 * - User profile  (requires authenticated userId)
 * - Home feed / course list (always fetched)
 *
 * Failures are swallowed — warming is best-effort and must never block startup.
 */
export async function warmCriticalCaches(): Promise<void> {
  const start = Date.now();

  const userId = useAppStore.getState().user?.id;

  const tasks: Promise<unknown>[] = [
    courseApi.getCourses().catch(() => null),
  ];

  if (userId) {
    tasks.push(userApi.getUser(userId).catch(() => null));
  }

  await Promise.all(tasks);

  appLogger.infoSync(`[CacheWarming] Completed in ${Date.now() - start}ms`);
}
