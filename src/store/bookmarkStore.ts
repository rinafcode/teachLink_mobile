import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { asyncStorageJSONStorage, createHydrationErrorRecovery } from './persistence';
import { apiService } from '../services/api';
import { logger } from '../utils/logger';

export interface BookmarkItem {
  itemId: string;
  itemType: string;
  title: string;
  url: string;
}

interface BookmarkState {
  bookmarks: BookmarkItem[];
  isLoading: boolean;
  addBookmark: (item: BookmarkItem) => Promise<void>;
  removeBookmark: (itemId: string) => Promise<void>;
  isBookmarked: (itemId: string) => boolean;
  validateBookmarks: () => Promise<void>;
}

/** Returns true if the course exists — checks API as the source of truth. */
async function courseExists(courseId: string): Promise<boolean> {
  try {
    await apiService.get(`/api/courses/${courseId}/exists`);
    return true;
  } catch {
    return false;
  }
}

const INITIAL_BOOKMARK_STATE = {
  bookmarks: [],
  isLoading: false,
};

let resetBookmarkStoreAfterHydrationError = () => {};

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get): BookmarkState => {
      resetBookmarkStoreAfterHydrationError = () => set(INITIAL_BOOKMARK_STATE);

      return {
        ...INITIAL_BOOKMARK_STATE,

        addBookmark: async item => {
          if (item.itemType === 'course') {
            const exists = await courseExists(item.itemId);
            if (!exists) {
              logger.warn('bookmarkStore: course not found, bookmark rejected', {
                courseId: item.itemId,
              });
              return;
            }
          }
          set(s => ({ bookmarks: [...s.bookmarks, item] }));
          try {
            await apiService.post('/api/bookmarks', {
              itemId: item.itemId,
              itemType: item.itemType,
            });
          } catch (error: any) {
            if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
              logger.error('bookmarkStore: addBookmark sync failed', error);
            }
          }
        },

        removeBookmark: async itemId => {
          set(s => ({ bookmarks: s.bookmarks.filter(b => b.itemId !== itemId) }));
          try {
            await apiService.delete(`/api/bookmarks/${itemId}`);
          } catch (error: any) {
            if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
              logger.error('bookmarkStore: removeBookmark sync failed', error);
            }
          }
        },

        isBookmarked: itemId => get().bookmarks.some(b => b.itemId === itemId),

        validateBookmarks: async () => {
          const courseBookmarks = get().bookmarks.filter(b => b.itemType === 'course');
          for (const bookmark of courseBookmarks) {
            const exists = await courseExists(bookmark.itemId);
            if (!exists) {
              logger.info('bookmarkStore: removing stale bookmark', { itemId: bookmark.itemId });
              set(s => ({ bookmarks: s.bookmarks.filter(b => b.itemId !== bookmark.itemId) }));
            }
          }
        },
      };
    },
    {
      name: 'bookmarks',
      storage: asyncStorageJSONStorage,
      onRehydrateStorage: createHydrationErrorRecovery(
        'bookmarks',
        resetBookmarkStoreAfterHydrationError
      ),
      partialize: state => ({ bookmarks: state.bookmarks }),
    }
  )
);
