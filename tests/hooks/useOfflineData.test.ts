import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useOfflineData } from '../../src/hooks/useOfflineData';
import { offlineStorage } from '../../src/services/offlineStorage';
import { syncService } from '../../src/services/syncService';

import type { OfflineDataItem } from '../../src/hooks/useOfflineData';

type Course = { title: string };

const mockRefreshNetworkStatus = jest.fn();
let mockIsOnline = false;

const mockSyncStats = {
  pendingCount: 0,
  failedCount: 0,
  isSyncing: false,
  successCount: 0,
  failureCount: 0,
  conflictCount: 0,
  successRate: 1,
};

jest.mock('../../src/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: mockIsOnline,
    refresh: mockRefreshNetworkStatus,
  }),
}));

jest.mock('../../src/services/offlineStorage', () => ({
  offlineStorage: {
    retrieve: jest.fn(),
    store: jest.fn(),
    addToSyncQueue: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../../src/services/syncService', () => ({
  __esModule: true,
  syncService: {
    getSyncStats: jest.fn(),
    manualSync: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
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

const mockRetrieve = offlineStorage.retrieve as jest.Mock;
const mockStore = offlineStorage.store as jest.Mock;
const mockAddToSyncQueue = offlineStorage.addToSyncQueue as jest.Mock;
const mockManualSync = syncService.manualSync as jest.Mock;
const mockGetSyncStats = syncService.getSyncStats as jest.Mock;

function storedCourse(
  id: string,
  data: Course,
  overrides: Partial<OfflineDataItem<Course>> = {}
): OfflineDataItem<Course> {
  return {
    id,
    data,
    status: 'synced',
    lastModified: 1000,
    syncAttempts: 0,
    version: 1,
    ...overrides,
  };
}

describe('useOfflineData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnline = false;
    mockRetrieve.mockResolvedValue(null);
    mockStore.mockResolvedValue(undefined);
    mockAddToSyncQueue.mockResolvedValue('op-1');
    mockManualSync.mockResolvedValue(undefined);
    mockGetSyncStats.mockResolvedValue(mockSyncStats);
  });

  it('persists and queues create mutations while offline', async () => {
    const { result } = renderHook(() => useOfflineData<Course>('courses', { autoSync: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addItem('course-1', { title: 'Offline draft' });
    });

    expect(result.current.getItem('course-1')).toEqual({ title: 'Offline draft' });
    expect(result.current.pendingCount).toBe(1);
    expect(mockStore).toHaveBeenLastCalledWith(
      'courses',
      expect.objectContaining({
        'course-1': expect.objectContaining({
          status: 'pending',
          operation: 'CREATE',
          deleted: false,
        }),
      })
    );
    expect(mockAddToSyncQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CREATE',
        endpoint: '/courses/course-1',
        data: { title: 'Offline draft' },
        conflictStrategy: 'server-wins',
      })
    );
    expect(mockManualSync).not.toHaveBeenCalled();
  });

  it('keeps deletes as pending tombstones until sync succeeds', async () => {
    mockRetrieve.mockResolvedValue({
      'course-1': storedCourse('course-1', { title: 'Saved course' }),
    });

    const { result } = renderHook(() => useOfflineData<Course>('courses', { autoSync: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteItem('course-1');
    });

    expect(result.current.getItem('course-1')).toBeNull();
    expect(result.current.deletedCount).toBe(1);
    expect(result.current.data['course-1']).toEqual(
      expect.objectContaining({
        status: 'pending',
        operation: 'DELETE',
        deleted: true,
        data: { title: 'Saved course' },
      })
    );
    expect(mockAddToSyncQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DELETE',
        endpoint: '/courses/course-1',
      })
    );
  });

  it('resolves conflicts with server, client, and manual strategies', async () => {
    mockRetrieve.mockResolvedValue({
      server: storedCourse(
        'server',
        { title: 'Local server copy' },
        {
          status: 'conflict',
          serverData: { title: 'Server copy' },
        }
      ),
      client: storedCourse(
        'client',
        { title: 'Client copy' },
        {
          status: 'conflict',
          serverData: { title: 'Ignored server copy' },
        }
      ),
      manual: storedCourse(
        'manual',
        { title: 'Local manual copy' },
        {
          status: 'conflict',
          serverData: { title: 'Server manual copy' },
        }
      ),
    });

    const { result } = renderHook(() => useOfflineData<Course>('courses', { autoSync: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.resolveConflict('server', undefined, 'server-wins');
    });
    expect(result.current.getItem('server')).toEqual({ title: 'Server copy' });

    await act(async () => {
      await result.current.resolveConflict('client', undefined, 'client-wins');
    });
    expect(result.current.getItem('client')).toEqual({ title: 'Client copy' });

    await act(async () => {
      await result.current.resolveConflict('manual', { title: 'Merged copy' }, 'manual');
    });
    expect(result.current.getItem('manual')).toEqual({ title: 'Merged copy' });

    expect(mockAddToSyncQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'UPDATE',
        endpoint: '/courses/server',
        data: { title: 'Server copy' },
        conflictStrategy: 'server-wins',
      })
    );
    expect(mockAddToSyncQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'UPDATE',
        endpoint: '/courses/client',
        data: { title: 'Client copy' },
        conflictStrategy: 'client-wins',
      })
    );
    expect(mockAddToSyncQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'UPDATE',
        endpoint: '/courses/manual',
        data: { title: 'Merged copy' },
        conflictStrategy: 'manual',
      })
    );
  });

  it('syncs pending records once when data loads on an online connection', async () => {
    mockIsOnline = true;
    mockRetrieve.mockResolvedValue({
      'course-1': storedCourse(
        'course-1',
        { title: 'Pending course' },
        {
          status: 'pending',
          operation: 'UPDATE',
        }
      ),
    });

    renderHook(() => useOfflineData<Course>('courses'));

    await waitFor(() => expect(mockManualSync).toHaveBeenCalledTimes(1));
    expect(mockAddToSyncQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'UPDATE',
        endpoint: '/courses/course-1',
        data: { title: 'Pending course' },
      })
    );
  });
});
