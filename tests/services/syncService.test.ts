import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { offlineStorage } from '../../src/services/offlineStorage';
import { syncService } from '../../src/services/syncService';
import { useSettingsStore } from '../../src/store/settingsStore';

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
  })),
}));

jest.mock('../../src/services/offlineStorage', () => ({
  offlineStorage: {
    getSyncQueue: jest.fn(() => Promise.resolve([])),
    getFailedOperations: jest.fn(() => Promise.resolve([])),
    removeFromSyncQueue: jest.fn(() => Promise.resolve()),
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
    default: mockLogger,
  };
});

describe('SyncService Data Saver Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({ dataSaverEnabled: false });
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
