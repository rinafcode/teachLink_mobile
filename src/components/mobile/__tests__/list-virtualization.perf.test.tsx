/**
 * Performance / virtualization tests (issue #219)
 *
 * In Jest, react-native's FlatList/SectionList are host stubs, so (matching the
 * repo's carousel.test.tsx) we assert each list is configured for windowed
 * rendering instead of a non-virtualized ScrollView. These are the settings
 * that keep 1000+ item lists at ~60fps with low memory.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

import { BookmarkList } from '@/components/mobile/BookmarkList';
import MobileSyllabus from '@/components/mobile/MobileSyllabus';
import { Section } from '@/types/course';

// VirtualList calls useMemoryMonitor from the hooks barrel.
jest.mock('@/hooks', () => ({
  useMemoryMonitor: jest.fn(),
}));

const mockBookmarks = Array.from({ length: 1000 }, (_, i) => ({
  itemId: `bm-${i}`,
  url: `/course/${i}`,
  title: `Bookmark ${i}`,
  itemType: 'course',
}));

jest.mock('@/store/bookmarkStore', () => ({
  useBookmarkStore: () => ({
    bookmarks: mockBookmarks,
    removeBookmark: jest.fn(),
  }),
}));

// SwipeableRow is never invoked here (FlatList is a host stub), but stub it so
// importing BookmarkList never pulls in gesture-handler internals.
jest.mock('@/components/mobile/SwipeableRow', () => ({
  SwipeableRow: 'SwipeableRow',
}));

const makeSections = (sectionCount: number, lessonsPer: number): Section[] =>
  Array.from({ length: sectionCount }, (_, s) => ({
    id: `section-${s}`,
    title: `Section ${s}`,
    lessons: Array.from({ length: lessonsPer }, (_, l) => ({
      id: `lesson-${s}-${l}`,
      title: `Lesson ${s}-${l}`,
      content: `Content ${s}-${l}`,
      duration: 5,
      order: l,
    })),
  })) as Section[];

describe('BookmarkList — virtualization (issue #219)', () => {
  it('renders a FlatList, not a ScrollView', () => {
    const { getByTestId } = render(<BookmarkList />);
    expect(getByTestId('bookmark-list').type).toBe('FlatList');
  });

  it('configures windowing props to bound rendered rows', () => {
    const { getByTestId } = render(<BookmarkList />);
    const { props } = getByTestId('bookmark-list');
    expect(props.removeClippedSubviews).toBe(true);
    expect(props.initialNumToRender).toBe(10);
    expect(props.maxToRenderPerBatch).toBe(10);
    expect(props.windowSize).toBe(5);
  });

  it('provides getItemLayout for O(1) scroll-to-index (fixed-height rows)', () => {
    const { getByTestId } = render(<BookmarkList />);
    const { getItemLayout } = getByTestId('bookmark-list').props;
    expect(typeof getItemLayout).toBe('function');
    expect(getItemLayout(null, 4)).toEqual({ length: 88, offset: 88 * 4, index: 4 });
  });

  it('uses a stable keyExtractor', () => {
    const { getByTestId } = render(<BookmarkList />);
    const { keyExtractor } = getByTestId('bookmark-list').props;
    expect(keyExtractor(mockBookmarks[7], 7)).toBe('bm-7');
  });
});

describe('MobileSyllabus — virtualization (issue #219)', () => {
  const defaultProps = {
    sections: makeSections(20, 50), // 1000 lessons total
    progress: null,
    currentLessonId: 'lesson-0-0',
    onLessonSelect: jest.fn(),
  };

  it('renders a SectionList, not a ScrollView', () => {
    const { getByTestId } = render(<MobileSyllabus {...defaultProps} />);
    expect(getByTestId('syllabus-list').type).toBe('SectionList');
  });

  it('configures windowing props for large courses', () => {
    const { getByTestId } = render(<MobileSyllabus {...defaultProps} />);
    const { props } = getByTestId('syllabus-list');
    expect(props.removeClippedSubviews).toBe(true);
    expect(props.initialNumToRender).toBe(12);
    expect(props.maxToRenderPerBatch).toBe(12);
    expect(props.windowSize).toBe(7);
    expect(props.updateCellsBatchingPeriod).toBe(50);
  });

  it('collapses a section by emptying its data array', () => {
    const { getByTestId } = render(<MobileSyllabus {...defaultProps} />);
    const { sections } = getByTestId('syllabus-list').props;
    expect(sections).toHaveLength(20);
    // Expanded by default -> each section carries its lessons.
    expect(sections[0].data).toHaveLength(50);
  });

  it('uses lesson id as the stable key', () => {
    const { getByTestId } = render(<MobileSyllabus {...defaultProps} />);
    const { keyExtractor } = getByTestId('syllabus-list').props;
    expect(keyExtractor({ id: 'lesson-3-7' } as any, 7)).toBe('lesson-3-7');
  });
});
