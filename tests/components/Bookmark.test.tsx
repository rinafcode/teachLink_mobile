import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import BookmarkButton from '../../src/components/mobile/BookmarkButton';
import BookmarkList from '../../src/components/mobile/BookmarkList';
import { useBookmarkStore } from '../../src/store/bookmarkStore';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import apiService from '../../src/services/api';

const mockPost = apiService.post as jest.Mock;
const mockDelete = apiService.delete as jest.Mock;

const ITEM = { itemId: 'lesson-1', itemType: 'lesson', title: 'Intro to React', url: '/lessons/lesson-1' };

beforeEach(() => {
  useBookmarkStore.setState({ bookmarks: [], isLoading: false });
  mockPost.mockClear();
  mockDelete.mockClear();
});

// ── BookmarkButton ─────────────────────────────────────────────────────────

describe('BookmarkButton', () => {
  it('renders in un-bookmarked state', () => {
    const { getByText } = render(<BookmarkButton item={ITEM} />);
    expect(getByText('Bookmark')).toBeTruthy();
  });

  it('pressing adds item to store and calls POST /api/bookmarks', async () => {
    const { getByTestId } = render(<BookmarkButton item={ITEM} />);
    fireEvent.press(getByTestId('bookmark-button'));

    await waitFor(() => {
      expect(useBookmarkStore.getState().isBookmarked(ITEM.itemId)).toBe(true);
    });
    expect(mockPost).toHaveBeenCalledWith('/api/bookmarks', {
      itemId: ITEM.itemId,
      itemType: ITEM.itemType,
    });
  });

  it('pressing again removes item from store and calls DELETE /api/bookmarks/:id', async () => {
    useBookmarkStore.setState({ bookmarks: [ITEM], isLoading: false });

    const { getByTestId } = render(<BookmarkButton item={ITEM} />);
    fireEvent.press(getByTestId('bookmark-button'));

    await waitFor(() => {
      expect(useBookmarkStore.getState().isBookmarked(ITEM.itemId)).toBe(false);
    });
    expect(mockDelete).toHaveBeenCalledWith(`/api/bookmarks/${ITEM.itemId}`);
  });

  it('shows "Bookmarked" label when item is already bookmarked', () => {
    useBookmarkStore.setState({ bookmarks: [ITEM], isLoading: false });
    const { getByText } = render(<BookmarkButton item={ITEM} />);
    expect(getByText('Bookmarked')).toBeTruthy();
  });

  it('persists bookmark to AsyncStorage via store persist middleware', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const { getByTestId } = render(<BookmarkButton item={ITEM} />);
    fireEvent.press(getByTestId('bookmark-button'));

    await waitFor(() => {
      expect(useBookmarkStore.getState().bookmarks).toContainEqual(ITEM);
    });
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

// ── BookmarkList ───────────────────────────────────────────────────────────

describe('BookmarkList', () => {
  it('shows empty state when no bookmarks', () => {
    const { getByText } = render(<BookmarkList />);
    expect(getByText('No bookmarks yet')).toBeTruthy();
  });

  it('renders bookmarked items from store', () => {
    useBookmarkStore.setState({ bookmarks: [ITEM], isLoading: false });
    const { getByTestId } = render(<BookmarkList />);
    expect(getByTestId(`bookmark-item-${ITEM.itemId}`)).toBeTruthy();
  });

  it('renders multiple bookmarks', () => {
    const items = [
      ITEM,
      { itemId: 'course-2', itemType: 'course', title: 'Advanced TypeScript', url: '/courses/course-2' },
    ];
    useBookmarkStore.setState({ bookmarks: items, isLoading: false });
    const { getByTestId } = render(<BookmarkList />);
    expect(getByTestId('bookmark-item-lesson-1')).toBeTruthy();
    expect(getByTestId('bookmark-item-course-2')).toBeTruthy();
  });

  it('does not show empty state when bookmarks exist', () => {
    useBookmarkStore.setState({ bookmarks: [ITEM], isLoading: false });
    const { queryByText } = render(<BookmarkList />);
    expect(queryByText('No bookmarks yet')).toBeNull();
  });
});
