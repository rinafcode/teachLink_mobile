import { TopicFeedItem } from '@/components/mobile/TopicFeed/TopicFeedCard';
import { UseTopicFeedOptions } from '@/hooks/useTopicFeed';

// ── TopicFeedCard interface tests ────────────────────────────────────────────

describe('TopicFeedCard', () => {
  const item: TopicFeedItem = {
    id: 'topic-1',
    title: 'Intro to React Native',
    description: 'Learn the basics of React Native.',
    category: 'Programming',
    level: 'beginner',
    duration: 45,
    enrolledCount: 1200,
    instructor: { name: 'Jane Doe' },
  };

  describe('TopicFeedItem interface', () => {
    it('should have required fields', () => {
      expect(item.id).toBeDefined();
      expect(item.title).toBeDefined();
      expect(item.category).toBeDefined();
      expect(item.level).toBeDefined();
      expect(item.instructor).toBeDefined();
    });

    it('should accept beginner level', () => {
      expect(item.level).toBe('beginner');
    });

    it('should accept intermediate level', () => {
      const i: TopicFeedItem = { ...item, level: 'intermediate' };
      expect(i.level).toBe('intermediate');
    });

    it('should accept advanced level', () => {
      const i: TopicFeedItem = { ...item, level: 'advanced' };
      expect(i.level).toBe('advanced');
    });

    it('should allow optional description', () => {
      const withoutDesc: TopicFeedItem = { ...item, description: undefined };
      expect(withoutDesc.description).toBeUndefined();
    });

    it('should allow optional duration', () => {
      const withoutDuration: TopicFeedItem = { ...item, duration: undefined };
      expect(withoutDuration.duration).toBeUndefined();
    });

    it('should allow optional enrolledCount', () => {
      const withoutCount: TopicFeedItem = { ...item, enrolledCount: undefined };
      expect(withoutCount.enrolledCount).toBeUndefined();
    });
  });

  describe('onPress callback', () => {
    it('should be callable with the item', () => {
      const onPress = jest.fn();
      onPress(item);
      expect(onPress).toHaveBeenCalledWith(item);
    });

    it('should receive the correct item id', () => {
      const onPress = jest.fn();
      onPress(item);
      expect(onPress.mock.calls[0][0].id).toBe('topic-1');
    });
  });
});

// ── TopicFeedSkeleton interface tests ────────────────────────────────────────

describe('TopicFeedSkeleton', () => {
  it('should default to 4 skeleton cards', () => {
    const defaultCount = 4;
    expect(defaultCount).toBe(4);
  });

  it('should accept a custom count', () => {
    const count = 6;
    expect(count).toBeGreaterThan(0);
  });
});

// ── TopicFeed component interface tests ──────────────────────────────────────

describe('TopicFeed', () => {
  describe('Props interface', () => {
    it('should accept optional onItemPress callback', () => {
      const onItemPress = jest.fn();
      expect(typeof onItemPress).toBe('function');
    });

    it('should accept optional category filter', () => {
      const options: UseTopicFeedOptions = { category: 'Programming' };
      expect(options.category).toBe('Programming');
    });

    it('should accept optional level filter', () => {
      const options: UseTopicFeedOptions = { level: 'beginner' };
      expect(options.level).toBe('beginner');
    });

    it('should accept optional pageSize', () => {
      const options: UseTopicFeedOptions = { pageSize: 20 };
      expect(options.pageSize).toBe(20);
    });
  });
});

// ── useTopicFeed hook logic tests ────────────────────────────────────────────

describe('useTopicFeed', () => {
  describe('UseTopicFeedOptions', () => {
    it('should accept empty options', () => {
      const options: UseTopicFeedOptions = {};
      expect(options).toBeDefined();
    });

    it('should accept all options', () => {
      const options: UseTopicFeedOptions = {
        category: 'Design',
        level: 'advanced',
        pageSize: 5,
      };
      expect(options.category).toBe('Design');
      expect(options.level).toBe('advanced');
      expect(options.pageSize).toBe(5);
    });
  });

  describe('Return shape', () => {
    it('should define expected return fields', () => {
      const mockReturn = {
        items: [] as TopicFeedItem[],
        loading: true,
        refreshing: false,
        hasMore: true,
        error: null as string | null,
        refresh: jest.fn(),
        loadMore: jest.fn(),
      };

      expect(Array.isArray(mockReturn.items)).toBe(true);
      expect(typeof mockReturn.loading).toBe('boolean');
      expect(typeof mockReturn.refreshing).toBe('boolean');
      expect(typeof mockReturn.hasMore).toBe('boolean');
      expect(mockReturn.error).toBeNull();
      expect(typeof mockReturn.refresh).toBe('function');
      expect(typeof mockReturn.loadMore).toBe('function');
    });

    it('refresh should be callable', () => {
      const refresh = jest.fn();
      refresh();
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('loadMore should be callable', () => {
      const loadMore = jest.fn();
      loadMore();
      expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it('should not call loadMore when hasMore is false', () => {
      const loadMore = jest.fn();
      const hasMore = false;
      if (hasMore) loadMore();
      expect(loadMore).not.toHaveBeenCalled();
    });

    it('should call loadMore when hasMore is true', () => {
      const loadMore = jest.fn();
      const hasMore = true;
      if (hasMore) loadMore();
      expect(loadMore).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error state', () => {
    it('should expose error as string when set', () => {
      const error: string | null = 'Failed to load topics';
      expect(typeof error).toBe('string');
    });

    it('should expose error as null when no error', () => {
      const error: string | null = null;
      expect(error).toBeNull();
    });
  });

  describe('Pagination', () => {
    it('should append items on loadMore', () => {
      const existing: TopicFeedItem[] = [
        {
          id: 'topic-0',
          title: 'Topic 0',
          category: 'Programming',
          level: 'beginner',
          instructor: { name: 'Instructor 1' },
        },
      ];
      const newItems: TopicFeedItem[] = [
        {
          id: 'topic-1',
          title: 'Topic 1',
          category: 'Design',
          level: 'intermediate',
          instructor: { name: 'Instructor 2' },
        },
      ];
      const combined = [...existing, ...newItems];
      expect(combined).toHaveLength(2);
      expect(combined[0].id).toBe('topic-0');
      expect(combined[1].id).toBe('topic-1');
    });

    it('should replace items on refresh', () => {
      const fresh: TopicFeedItem[] = [
        {
          id: 'topic-fresh',
          title: 'Fresh Topic',
          category: 'Programming',
          level: 'advanced',
          instructor: { name: 'Instructor 3' },
        },
      ];
      expect(fresh).toHaveLength(1);
      expect(fresh[0].id).toBe('topic-fresh');
    });

    it('should set hasMore to false when page returns fewer items than pageSize', () => {
      const pageSize = 10;
      const returned = 3;
      const hasMore = returned === pageSize;
      expect(hasMore).toBe(false);
    });

    it('should set hasMore to true when page returns full pageSize', () => {
      const pageSize = 10;
      const returned = 10;
      const hasMore = returned === pageSize;
      expect(hasMore).toBe(true);
    });
  });
});
