import { useCallback, useEffect, useState } from 'react';

import { courseApi } from '@/services/api/courseApi';
import { CursorPageRequest } from '@/services/api/cursorPagination';
import { Course } from '@/types/course';

export interface UseCoursePaginationOptions {
  initialLimit?: number;
  orderBy?: string;
  direction?: 'asc' | 'desc';
}

export interface UseCoursePaginationResult {
  items: Course[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  loadNextPage: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCoursePagination(
  options: UseCoursePaginationOptions = {},
): UseCoursePaginationResult {
  const {
    initialLimit = 20,
    orderBy = 'id',
    direction = 'asc',
  } = options;

  const [items, setItems] = useState<Course[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPage = useCallback(async (cursor?: string) => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    const request: CursorPageRequest = {
      limit: initialLimit,
      cursor,
      orderBy,
      direction,
    };

    try {
      const response = await courseApi.getCoursesPage(request);

      setItems((previous) => {
        if (!cursor) {
          return response.items;
        }

        const existingIds = new Set(previous.map((course) => course.id));
        return [...previous, ...response.items.filter((course) => !existingIds.has(course.id))];
      });
      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } finally {
      setIsLoading(false);
    }
  }, [direction, initialLimit, isLoading, orderBy]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setNextCursor(null);
    setHasMore(true);
    setItems([]);

    try {
      await fetchPage();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchPage]);

  const loadNextPage = useCallback(async () => {
    if (!hasMore || isLoading) {
      return;
    }

    await fetchPage(nextCursor ?? undefined);
  }, [fetchPage, hasMore, isLoading, nextCursor]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    items,
    isLoading,
    isRefreshing,
    hasMore,
    nextCursor,
    loadNextPage,
    refresh,
  };
}
