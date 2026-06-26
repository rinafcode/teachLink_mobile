import { act, renderHook } from '@testing-library/react-native';

import { useAppUpdate } from '../../hooks/useAppUpdate';
import { appUpdateService } from '../../services/appUpdateService';

jest.mock('../../services/appUpdateService', () => ({
  appUpdateService: {
    checkForUpdate: jest.fn(),
    downloadAndApplyOtaUpdate: jest.fn(),
    openStoreForUpdate: jest.fn(),
    trackDismissed: jest.fn(),
    shouldCheck: jest.fn(() => true),
    getCurrentVersion: jest.fn(() => '1.4.0'),
  },
}));

const mockService = appUpdateService as jest.Mocked<typeof appUpdateService>;

describe('useAppUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockService.shouldCheck.mockReturnValue(true);
  });

  describe('initial state', () => {
    it('starts with no check result and no errors', () => {
      mockService.checkForUpdate.mockResolvedValue({
        updateAvailable: false,
        updateType: 'none',
        currentVersion: '1.4.0',
      });

      const { result } = renderHook(() => useAppUpdate(false));

      expect(result.current.isChecking).toBe(false);
      expect(result.current.isDownloading).toBe(false);
      expect(result.current.checkResult).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('checkForUpdate', () => {
    it('sets isChecking during check and clears it after', async () => {
      mockService.checkForUpdate.mockResolvedValueOnce({
        updateAvailable: false,
        updateType: 'none',
        currentVersion: '1.4.0',
      });

      const { result } = renderHook(() => useAppUpdate(false));

      await act(async () => {
        await result.current.checkForUpdate();
      });

      expect(result.current.isChecking).toBe(false);
      expect(mockService.checkForUpdate).toHaveBeenCalledTimes(1);
    });

    it('populates checkResult when update is available', async () => {
      const mockResult = {
        updateAvailable: true,
        updateType: 'ota' as const,
        currentVersion: '1.4.0',
        releaseNotes: 'Performance improvements',
        isMandatory: false,
      };
      mockService.checkForUpdate.mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useAppUpdate(false));

      await act(async () => {
        await result.current.checkForUpdate();
      });

      expect(result.current.checkResult).toEqual(mockResult);
      expect(result.current.error).toBeNull();
    });

    it('sets error when service throws', async () => {
      mockService.checkForUpdate.mockRejectedValueOnce(new Error('Network timeout'));

      const { result } = renderHook(() => useAppUpdate(false));

      await act(async () => {
        await result.current.checkForUpdate();
      });

      expect(result.current.error).toBe('Network timeout');
      expect(result.current.isChecking).toBe(false);
    });

    it('auto-checks on mount when checkOnMount is true and shouldCheck returns true', async () => {
      mockService.checkForUpdate.mockResolvedValueOnce({
        updateAvailable: false,
        updateType: 'none',
        currentVersion: '1.4.0',
      });

      await act(async () => {
        renderHook(() => useAppUpdate(true));
      });

      expect(mockService.checkForUpdate).toHaveBeenCalledTimes(1);
    });

    it('does not auto-check when shouldCheck returns false', async () => {
      mockService.shouldCheck.mockReturnValue(false);

      await act(async () => {
        renderHook(() => useAppUpdate(true));
      });

      expect(mockService.checkForUpdate).not.toHaveBeenCalled();
    });
  });

  describe('applyUpdate', () => {
    it('calls downloadAndApplyOtaUpdate and clears downloading state', async () => {
      mockService.downloadAndApplyOtaUpdate.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useAppUpdate(false));

      await act(async () => {
        await result.current.applyUpdate();
      });

      expect(mockService.downloadAndApplyOtaUpdate).toHaveBeenCalledTimes(1);
      expect(result.current.isDownloading).toBe(false);
    });

    it('sets error when apply returns false', async () => {
      mockService.downloadAndApplyOtaUpdate.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useAppUpdate(false));

      await act(async () => {
        await result.current.applyUpdate();
      });

      expect(result.current.error).toBe('Update could not be applied. Please try again.');
      expect(result.current.isDownloading).toBe(false);
    });
  });

  describe('openStore', () => {
    it('delegates to service', async () => {
      mockService.openStoreForUpdate.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAppUpdate(false));

      await act(async () => {
        await result.current.openStore();
      });

      expect(mockService.openStoreForUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('dismiss', () => {
    it('clears checkResult and tracks dismissal', async () => {
      mockService.checkForUpdate.mockResolvedValueOnce({
        updateAvailable: true,
        updateType: 'ota',
        currentVersion: '1.4.0',
      });

      const { result } = renderHook(() => useAppUpdate(false));

      await act(async () => {
        await result.current.checkForUpdate();
      });

      expect(result.current.checkResult).not.toBeNull();

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.checkResult).toBeNull();
      expect(mockService.trackDismissed).toHaveBeenCalledWith('ota');
    });
  });
});
