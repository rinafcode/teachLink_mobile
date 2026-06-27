/**
 * Tests for #617 — bookmarkStore course validation and stale bookmark removal
 */
import { apiService } from '../../services/api';
import { useBookmarkStore } from '../../store/bookmarkStore';

jest.mock('../../services/api', () => ({
  __esModule: true,
  apiService: {
    get: jest.fn(),
    post: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  appLogger: { errorSync: jest.fn(), warnSync: jest.fn(), infoSync: jest.fn() },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  mergeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  multiMerge: jest.fn(() => Promise.resolve()),
}));

const COURSE_BOOKMARK = {
  itemId: 'course-1',
  itemType: 'course',
  title: 'Course 1',
  url: '/courses/1',
};
const NON_COURSE_BOOKMARK = {
  itemId: 'note-1',
  itemType: 'note',
  title: 'Note 1',
  url: '/notes/1',
};

describe('bookmarkStore — course validation (#617)', () => {
  beforeEach(() => {
    useBookmarkStore.setState({ bookmarks: [] });
    jest.clearAllMocks();
    (apiService.post as jest.Mock).mockResolvedValue({});
    (apiService.delete as jest.Mock).mockResolvedValue({});
  });

  describe('addBookmark', () => {
    it('adds a course bookmark when the course exists', async () => {
      (apiService.get as jest.Mock).mockResolvedValueOnce({ exists: true });

      await useBookmarkStore.getState().addBookmark(COURSE_BOOKMARK);

      expect(useBookmarkStore.getState().bookmarks).toHaveLength(1);
      expect(apiService.get).toHaveBeenCalledWith('/api/courses/course-1/exists');
    });

    it('rejects a course bookmark when the course does not exist', async () => {
      (apiService.get as jest.Mock).mockRejectedValueOnce(new Error('Not Found'));

      await useBookmarkStore.getState().addBookmark(COURSE_BOOKMARK);

      expect(useBookmarkStore.getState().bookmarks).toHaveLength(0);
    });

    it('adds a non-course bookmark without calling the course-exists API', async () => {
      await useBookmarkStore.getState().addBookmark(NON_COURSE_BOOKMARK);

      expect(useBookmarkStore.getState().bookmarks).toHaveLength(1);
      expect(apiService.get).not.toHaveBeenCalled();
    });
  });

  describe('validateBookmarks', () => {
    it('removes bookmarks for courses that no longer exist', async () => {
      useBookmarkStore.setState({ bookmarks: [COURSE_BOOKMARK] });
      (apiService.get as jest.Mock).mockRejectedValueOnce(new Error('Not Found'));

      await useBookmarkStore.getState().validateBookmarks();

      expect(useBookmarkStore.getState().bookmarks).toHaveLength(0);
    });

    it('keeps bookmarks for courses that still exist', async () => {
      useBookmarkStore.setState({ bookmarks: [COURSE_BOOKMARK] });
      (apiService.get as jest.Mock).mockResolvedValueOnce({ exists: true });

      await useBookmarkStore.getState().validateBookmarks();

      expect(useBookmarkStore.getState().bookmarks).toHaveLength(1);
    });

    it('only validates course-type bookmarks', async () => {
      useBookmarkStore.setState({ bookmarks: [NON_COURSE_BOOKMARK] });

      await useBookmarkStore.getState().validateBookmarks();

      expect(apiService.get).not.toHaveBeenCalled();
      expect(useBookmarkStore.getState().bookmarks).toHaveLength(1);
    });
  });
});
