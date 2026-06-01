import { useCallback, useEffect, useRef, useState } from 'react';

import { TopicFeedItem } from '../components/mobile/TopicFeed/TopicFeedCard';

export interface UseTopicFeedOptions {
  /** Category filter; undefined means all categories */
  category?: string;
  /** Level filter; undefined means all levels */
  level?: TopicFeedItem['level'];
  /** Number of items per page */
  pageSize?: number;
}

export interface UseTopicFeedReturn {
  items: TopicFeedItem[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => void;
  loadMore: () => void;
}

// Simulated fetch — replace with real API call (e.g. fetchWithSWR / apiClient)
async function fetchTopics(
  page: number,
  pageSize: number,
  category?: string,
  level?: TopicFeedItem['level']
): Promise<TopicFeedItem[]> {
  await new Promise<void>(r => setTimeout(r, 600));

  const all: TopicFeedItem[] = Array.from({ length: pageSize }, (_, i) => {
    const idx = (page - 1) * pageSize + i;
    const levels: TopicFeedItem['level'][] = ['beginner', 'intermediate', 'advanced'];
    return {
      id: `topic-${idx}`,
      title: `Topic ${idx + 1}`,
      description: `Learn the fundamentals of topic ${idx + 1} with hands-on examples.`,
      category: category ?? (idx % 2 === 0 ? 'Programming' : 'Design'),
      level: level ?? levels[idx % 3],
      duration: 30 + (idx % 5) * 15,
      enrolledCount: 100 + idx * 17,
      instructor: { name: `Instructor ${(idx % 4) + 1}` },
    };
  });

  // Simulate end of data after page 3
  return page > 3 ? [] : all;
}

export const useTopicFeed = ({
  category,
  level,
  pageSize = 10,
}: UseTopicFeedOptions = {}): UseTopicFeedReturn => {
  const [items, setItems] = useState<TopicFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef(1);
  const fetchingRef = useRef(false);

  const load = useCallback(
    async (page: number, replace: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setError(null);

      try {
        const data = await fetchTopics(page, pageSize, category, level);
        setItems(prev => (replace ? data : [...prev, ...data]));
        setHasMore(data.length === pageSize);
        pageRef.current = page;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load topics');
      } finally {
        fetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, level, pageSize]
  );

  // Initial load and filter changes
  useEffect(() => {
    setLoading(true);
    setItems([]);
    setHasMore(true);
    load(1, true);
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load(1, true);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!hasMore || fetchingRef.current) return;
    load(pageRef.current + 1, false);
  }, [hasMore, load]);

  return { items, loading, refreshing, hasMore, error, refresh, loadMore };
};
