import { Course } from "../../types/course";
import { batchClient } from "./batchClient";
import { fetchWithSWR, invalidateCache } from "./cache";
import {
    buildCursorCacheKey,
    CursorPageRequest,
    CursorPageResponse,
} from "./cursorPagination";

const COURSES_KEY = "courses:list";
const courseKey = (id: string) => `courses:${id}`;

// 2 min fresh, 10 min stale window
const TTL = 2 * 60_000;
const STALE_TTL = 10 * 60_000;

export const courseApi = {
  getCourses(): Promise<Course[]> {
    return fetchWithSWR(
      COURSES_KEY,
      () => batchClient.get("/courses"),
      TTL,
      STALE_TTL,
    );
  },

  getCoursesPage(request: CursorPageRequest = {}): Promise<CursorPageResponse<Course>> {
    const { limit = 20, cursor, orderBy = 'id', direction = 'asc' } = request;
    const cacheKey = buildCursorCacheKey({ limit, cursor, orderBy, direction });

    return fetchWithSWR(
      cacheKey,
      () => apiClient
        .get<CursorPageResponse<Course>>("/courses", {
          params: { limit, cursor, orderBy, direction },
        })
        .then((r) => r.data),
      TTL,
      STALE_TTL,
    );
  },

  getCoursesPage(request: CursorPageRequest = {}): Promise<CursorPageResponse<Course>> {
    const { limit = 20, cursor, orderBy = 'id', direction = 'asc' } = request;
    const cacheKey = buildCursorCacheKey({ limit, cursor, orderBy, direction });

    return fetchWithSWR(
      cacheKey,
      () => apiClient
        .get<CursorPageResponse<Course>>("/courses", {
          params: { limit, cursor, orderBy, direction },
        })
        .then((r) => r.data),
      TTL,
      STALE_TTL,
    );
  },

  getCourse(id: string): Promise<Course> {
    return fetchWithSWR(
      courseKey(id),
      () => batchClient.get(`/courses/${id}`),
      TTL,
      STALE_TTL,
    );
  },

  invalidateCourses(): void {
    invalidateCache(COURSES_KEY);
  },

  invalidateCourse(id: string): void {
    invalidateCache(courseKey(id));
  },
};
