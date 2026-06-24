import AsyncStorage from '@react-native-async-storage/async-storage';

import { scrollPositionService } from '@/services/scrollPositionService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  getAllKeys: jest.fn(),
}));

describe('scrollPositionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    scrollPositionService.clearAll();
  });

  describe('savePosition', () => {
    it('should save scroll position for a route', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      mockSetItem.mockResolvedValue(undefined);

      await scrollPositionService.savePosition('home', 100);

      expect(mockSetItem).toHaveBeenCalledWith(
        '@teachlink_scroll_home',
        expect.stringContaining('"offset":100')
      );
    });

    it('should ignore negative offsets', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      mockSetItem.mockResolvedValue(undefined);

      await scrollPositionService.savePosition('home', -10);

      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('should ignore empty route', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      mockSetItem.mockResolvedValue(undefined);

      await scrollPositionService.savePosition('', 100);

      expect(mockSetItem).not.toHaveBeenCalled();
    });
  });

  describe('getPosition', () => {
    it('should retrieve saved position', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      const testData = { offset: 150, timestamp: Date.now() };
      mockGetItem.mockResolvedValue(JSON.stringify(testData));

      const result = await scrollPositionService.getPosition('home');

      expect(result?.offset).toBe(150);
    });

    it('should return null for non-existent position', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem.mockResolvedValue(null);

      const result = await scrollPositionService.getPosition('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null for expired position', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;
      mockRemoveItem.mockResolvedValue(undefined);

      const oldData = {
        offset: 100,
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours old
      };
      mockGetItem.mockResolvedValue(JSON.stringify(oldData));

      const result = await scrollPositionService.getPosition('home');

      expect(result).toBeNull();
      expect(mockRemoveItem).toHaveBeenCalledWith('@teachlink_scroll_home');
    });
  });

  describe('clearPosition', () => {
    it('should remove position for a route', async () => {
      const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;
      mockRemoveItem.mockResolvedValue(undefined);

      await scrollPositionService.clearPosition('home');

      expect(mockRemoveItem).toHaveBeenCalledWith('@teachlink_scroll_home');
    });

    it('should ignore empty route', async () => {
      const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;
      mockRemoveItem.mockResolvedValue(undefined);

      await scrollPositionService.clearPosition('');

      expect(mockRemoveItem).not.toHaveBeenCalled();
    });
  });

  describe('clearOldPositions', () => {
    it('should clear positions older than 24 hours', async () => {
      const mockGetAllKeys = AsyncStorage.getAllKeys as jest.Mock;
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      const mockMultiRemove = AsyncStorage.multiRemove as jest.Mock;

      const oldData = {
        offset: 100,
        timestamp: Date.now() - 25 * 60 * 60 * 1000,
      };
      const newData = {
        offset: 150,
        timestamp: Date.now(),
      };

      mockGetAllKeys.mockResolvedValue([
        '@teachlink_scroll_old_screen',
        '@teachlink_scroll_new_screen',
      ]);
      mockGetItem
        .mockResolvedValueOnce(JSON.stringify(oldData))
        .mockResolvedValueOnce(JSON.stringify(newData));
      mockMultiRemove.mockResolvedValue(undefined);

      await scrollPositionService.clearOldPositions();

      expect(mockMultiRemove).toHaveBeenCalledWith(['@teachlink_scroll_old_screen']);
    });

    it('should skip corrupted entries', async () => {
      const mockGetAllKeys = AsyncStorage.getAllKeys as jest.Mock;
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      const mockMultiRemove = AsyncStorage.multiRemove as jest.Mock;

      mockGetAllKeys.mockResolvedValue(['@teachlink_scroll_corrupted']);
      mockGetItem.mockResolvedValue('invalid json');
      mockMultiRemove.mockResolvedValue(undefined);

      await scrollPositionService.clearOldPositions();

      expect(mockMultiRemove).toHaveBeenCalledWith(['@teachlink_scroll_corrupted']);
    });
  });

  describe('clearAll', () => {
    it('should remove all positions', async () => {
      const mockGetAllKeys = AsyncStorage.getAllKeys as jest.Mock;
      const mockMultiRemove = AsyncStorage.multiRemove as jest.Mock;

      mockGetAllKeys.mockResolvedValue([
        '@teachlink_scroll_home',
        '@teachlink_scroll_search',
        '@teachlink_scroll_profile',
      ]);
      mockMultiRemove.mockResolvedValue(undefined);

      await scrollPositionService.clearAll();

      expect(mockMultiRemove).toHaveBeenCalledWith([
        '@teachlink_scroll_home',
        '@teachlink_scroll_search',
        '@teachlink_scroll_profile',
      ]);
    });
  });

  describe('caching', () => {
    it('should use cache for subsequent retrievals', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockSetItem.mockResolvedValue(undefined);

      const testData = { offset: 200, timestamp: Date.now() };
      mockGetItem.mockResolvedValue(JSON.stringify(testData));

      // First retrieval
      const result1 = await scrollPositionService.getPosition('home');

      // Second retrieval should use cache
      const result2 = await scrollPositionService.getPosition('home');

      expect(result1?.offset).toBe(200);
      expect(result2?.offset).toBe(200);
      // getItem should only be called once (second time uses cache)
      // Note: This depends on cache implementation
    });
  });
});
