import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import AsyncStorage from '@react-native-async-storage/async-storage';

import apiService from '../services/api';
import logger from '../utils/logger';

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
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      isLoading: false,

      addBookmark: async (item) => {
        set((s) => ({ bookmarks: [...s.bookmarks, item] }));
        try {
          await apiService.post('/api/bookmarks', { itemId: item.itemId, itemType: item.itemType });
        } catch (error: any) {
          if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
            logger.error('bookmarkStore: addBookmark sync failed', error);
          }
        }
      },

      removeBookmark: async (itemId) => {
        set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.itemId !== itemId) }));
        try {
          await apiService.delete(`/api/bookmarks/${itemId}`);
        } catch (error: any) {
          if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
            logger.error('bookmarkStore: removeBookmark sync failed', error);
          }
        }
      },

      isBookmarked: (itemId) => get().bookmarks.some((b) => b.itemId === itemId),
    }),
    {
      name: 'bookmarks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ bookmarks: state.bookmarks }),
    },
  ),
);
