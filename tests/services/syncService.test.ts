import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { apiService } from '../../src/services/api';
import { offlineStorage } from '../../src/services/offlineStorage';
import { SyncService, syncService } from '../../src/services/syncService';
import { useDeviceStore } from '../../src/store/deviceStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useSyncStore } from '../../src/store/syncStore';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
    })
  ),
}));

jest.mock('../../src/services/offlineStorage', () => ({
  offlineStorage: {
    getSyncQueue: jest.fn(() => Promise.resolve([])),
    getFailedOperations: jest.fn(() => Promise.resolve([])),
    incrementRetryCount: jest.fn(() => Promise.resolve()),
    removeFromSyncQueue: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../src/services/api', () => ({
  apiService: {
    get: jest.fn(() => Promise.resolve({})),
    post: jest.fn(() => Promise.resolve({})),
    put: jest.fn(() => Promise.resolve({})),
    delete: jest.fn(() => Promise.resolve({})),
  },
}));

jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    logger: mockLogger,
    default: mockLogger,
  };
});

describe('SyncService Data Saver Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({ dataSaverEnabled: false });
    useDeviceStore.setState({ isLowBattery: false });
    useSyncStore.getState().resetSyncStatus();
  });

  it('should run auto-sync (isManual = false) when dataSaverEnabled is false', async () => {
    const getSyncQueueSpy = jest.spyOn(offlineStorage, 'getSyncQueue');

    // Call the internal syncPendingOperations method directly
    await (syncService as any).syncPendingOperations(false);

    expect(getSyncQueueSpy).toHaveBeenCalled();
  });

  it('should bypass auto-sync (isManual = false) when dataSaverEnabled is true', async () => {
    useSettingsStore.setState({ dataSaverEnabled: true });
    const getSyncQueueSpy = jest.spyOn(offlineStorage, 'getSyncQueue');

    await (syncService as any).syncPendingOperations(false);

    expect(getSyncQueueSpy).not.toHaveBeenCalled();
  });

  it('should still run manual sync (isManual = true) even when dataSaverEnabled is true', async () => {
    useSettingsStore.setState({ dataSaverEnabled: true });
    const getSyncQueueSpy = jest.spyOn(offlineStorage, 'getSyncQueue');

    await (syncService as any).syncPendingOperations(true);

    expect(getSyncQueueSpy).toHaveBeenCalled();
  });
});

describe('SyncService auto-sync backoff', () => {
  const baseInterval = 1000;
  const queuedReadOperation = {
    id: 'op-read-1',
    type: 'READ' as const,
    endpoint: '/courses',
    timestamp: 1,
    retries: 0,
    maxRetries: 0,
    priority: 'medium' as const,
  };

  let service: SyncService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useSettingsStore.setState({ dataSaverEnabled: false });
    useDeviceStore.setState({ isLowBattery: false });
    useSyncStore.getState().resetSyncStatus();
    (offlineStorage.getSyncQueue as jest.Mock).mockResolvedValue([queuedReadOperation]);
    service = new SyncService({ syncInterval: baseInterval });
  });

  afterEach(() => {
    service.stopAutoSync();
    jest.useRealTimers();
  });

  it('doubles the auto-sync retry interval after the 1st and 3rd consecutive failures', async () => {
    (apiService.get as jest.Mock).mockRejectedValue(new Error('backend unavailable'));

    service.startAutoSync();

    await jest.advanceTimersByTimeAsync(baseInterval);
    expect(useSyncStore.getState().syncStatus).toMatchObject({
      consecutiveFailureCount: 1,
      backoffMs: 2000,
      circuitOpen: false,
    });

    await jest.advanceTimersByTimeAsync(2000);
    await jest.advanceTimersByTimeAsync(4000);

    expect(useSyncStore.getState().syncStatus).toMatchObject({
      consecutiveFailureCount: 3,
      backoffMs: 8000,
      circuitOpen: false,
    });
  });

  it('opens the circuit on the 5th failure and waits 10 minutes before trying again', async () => {
    (apiService.get as jest.Mock)
      .mockRejectedValueOnce(new Error('failure 1'))
      .mockRejectedValueOnce(new Error('failure 2'))
      .mockRejectedValueOnce(new Error('failure 3'))
      .mockRejectedValueOnce(new Error('failure 4'))
      .mockRejectedValueOnce(new Error('failure 5'))
      .mockResolvedValueOnce({});

    service.startAutoSync();

    await jest.advanceTimersByTimeAsync(baseInterval);
    await jest.advanceTimersByTimeAsync(2000);
    await jest.advanceTimersByTimeAsync(4000);
    await jest.advanceTimersByTimeAsync(8000);
    await jest.advanceTimersByTimeAsync(16000);

    expect(apiService.get).toHaveBeenCalledTimes(5);
    expect(useSyncStore.getState().syncStatus).toMatchObject({
      consecutiveFailureCount: 5,
      backoffMs: 600000,
      circuitOpen: true,
    });

    await jest.advanceTimersByTimeAsync(599999);
    expect(apiService.get).toHaveBeenCalledTimes(5);
    expect(useSyncStore.getState().syncStatus.circuitOpen).toBe(true);

    await jest.advanceTimersByTimeAsync(1);

    expect(apiService.get).toHaveBeenCalledTimes(6);
    expect(useSyncStore.getState().syncStatus).toMatchObject({
      consecutiveFailureCount: 0,
      backoffMs: baseInterval,
      circuitOpen: false,
    });
  });

  it('resets consecutive failures and interval to base after a successful sync', async () => {
    (apiService.get as jest.Mock)
      .mockRejectedValueOnce(new Error('temporary outage'))
      .mockResolvedValueOnce({});

    service.startAutoSync();

    await jest.advanceTimersByTimeAsync(baseInterval);
    expect(useSyncStore.getState().syncStatus).toMatchObject({
      consecutiveFailureCount: 1,
      backoffMs: 2000,
    });

    await jest.advanceTimersByTimeAsync(2000);

    expect(useSyncStore.getState().syncStatus).toMatchObject({
      consecutiveFailureCount: 0,
      backoffMs: baseInterval,
      circuitOpen: false,
    });
  });
});
