/**
 * Tests for #660 — 409 Conflict handling in axios interceptor
 */
import { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Store the interceptor handlers for testing
let responseErrorHandler: ((error: AxiosError) => Promise<any>) | null = null;

// Mock axios before importing the module
jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    ...actualAxios,
    create: jest.fn(() => ({
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn((successHandler, errorHandler) => {
            responseErrorHandler = errorHandler;
          }),
        },
      },
      defaults: {
        headers: {
          common: {},
        },
      },
    })),
    isAxiosError: actualAxios.isAxiosError,
  };
});

// Mock dependencies
jest.mock('../../../services/api/cache', () => ({
  invalidateCacheForBatchRequests: jest.fn(),
  invalidateCacheForMutation: jest.fn(),
  invalidateByPattern: jest.fn(),
}));

jest.mock('../../../services/api/requestQueue', () => ({
  requestQueue: {
    addToQueue: jest.fn(),
  },
}));

const mockAddConflict = jest.fn();
jest.mock('../../../store/conflictStore', () => ({
  useConflictStore: {
    getState: () => ({
      addConflict: mockAddConflict,
    }),
  },
}));

jest.mock('../../../config', () => ({
  getEnv: jest.fn(() => 'https://api.test.com'),
}));

jest.mock('../../../config/apiCacheConfig', () => ({
  MUTATION_INVALIDATION_MAP: [],
}));

jest.mock('../../../config/security', () => ({
  SSL_PINNING: { bypassEnabled: false },
}));

jest.mock('../../../store', () => ({
  useAppStore: {
    getState: () => ({
      logout: jest.fn(),
    }),
  },
}));

jest.mock('../../../utils/logger', () => ({
  appLogger: {
    warnSync: jest.fn(),
    errorSync: jest.fn(),
  },
}));

jest.mock('../../../utils/performanceTiming', () => ({
  startTiming: jest.fn(),
  notifyEntry: jest.fn(),
}));

jest.mock('../../../services/healthMetrics', () => ({
  healthMetricsService: {
    recordApiCall: jest.fn(),
  },
}));

jest.mock('../../../services/sentryContext', () => ({
  sentryContextService: {
    captureException: jest.fn(),
  },
}));

jest.mock('../../../services/secureStorage', () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  saveTokens: jest.fn(),
}));

// Import the module after mocks are set up to capture the interceptor
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('../../../services/api/axios.config');

describe('axios.config — 409 Conflict handling (#660)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createAxiosError = (
    status: number,
    responseData: any,
    config: Partial<InternalAxiosRequestConfig> = {}
  ): AxiosError => {
    const error = new Error('Request failed') as AxiosError;
    error.isAxiosError = true;
    error.response = {
      status,
      data: responseData,
      statusText: status === 409 ? 'Conflict' : 'Error',
      headers: {},
      config: config as InternalAxiosRequestConfig,
    };
    error.config = {
      url: '/api/notes/123',
      method: 'put',
      data: { title: 'Local Title' },
      headers: {
        'X-Last-Known-Version': '1',
        'X-Client-Timestamp': String(Date.now() - 5000),
        'X-Entity-Type': 'note',
        'X-Entity-Id': 'note-123',
      },
      ...config,
    } as InternalAxiosRequestConfig;
    return error;
  };

  describe('409 Conflict response handling', () => {
    it('adds conflict to store when 409 received', async () => {
      expect(responseErrorHandler).not.toBeNull();

      const error = createAxiosError(409, {
        serverVersion: { title: 'Server Title' },
        serverVersionNumber: 2,
        entityType: 'note',
        entityId: 'note-123',
        message: 'Version conflict detected',
      });

      await expect(responseErrorHandler!(error)).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT',
      });

      expect(mockAddConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'note-123',
          entityType: 'note',
          localData: { title: 'Local Title' },
          serverData: { title: 'Server Title' },
          localVersion: 1,
          serverVersion: 2,
          endpoint: '/api/notes/123',
          method: 'PUT',
        })
      );
    });

    it('extracts version metadata from request headers', async () => {
      expect(responseErrorHandler).not.toBeNull();

      const clientTimestamp = Date.now() - 5000;
      const error = createAxiosError(
        409,
        { serverVersion: {}, serverVersionNumber: 3 },
        {
          headers: {
            'X-Last-Known-Version': '2',
            'X-Client-Timestamp': String(clientTimestamp),
            'X-Entity-Type': 'quiz',
            'X-Entity-Id': 'quiz-456',
          } as any,
        }
      );

      await expect(responseErrorHandler!(error)).rejects.toMatchObject({
        status: 409,
      });

      expect(mockAddConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          localVersion: 2,
          clientTimestamp,
          entityType: 'quiz',
          entityId: 'quiz-456',
        })
      );
    });

    it('uses fallback values when headers are missing', async () => {
      expect(responseErrorHandler).not.toBeNull();

      const error = createAxiosError(
        409,
        { serverVersion: {}, serverVersionNumber: 1 },
        {
          headers: {} as any,
        }
      );

      await expect(responseErrorHandler!(error)).rejects.toMatchObject({
        status: 409,
      });

      expect(mockAddConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'unknown',
          entityId: '',
        })
      );
    });

    it('generates unique conflict id', async () => {
      expect(responseErrorHandler).not.toBeNull();

      const error = createAxiosError(409, { serverVersion: {} });

      await expect(responseErrorHandler!(error)).rejects.toBeDefined();

      const calledWith = mockAddConflict.mock.calls[0][0];
      expect(calledWith.id).toMatch(/^conflict_\d+_[a-z0-9]+$/);
    });

    it('includes conflict data in rejection', async () => {
      expect(responseErrorHandler).not.toBeNull();

      const error = createAxiosError(409, {
        serverVersion: { data: 'server' },
        message: 'Custom conflict message',
      });

      await expect(responseErrorHandler!(error)).rejects.toMatchObject({
        message: 'Custom conflict message',
        status: 409,
        code: 'CONFLICT',
        conflict: expect.objectContaining({
          serverData: { data: 'server' },
        }),
      });
    });

    it('logs conflict detection', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { appLogger } = require('../../../utils/logger');
      expect(responseErrorHandler).not.toBeNull();

      const error = createAxiosError(409, {
        serverVersion: {},
        serverVersionNumber: 2,
      });

      await expect(responseErrorHandler!(error)).rejects.toBeDefined();

      expect(appLogger.warnSync).toHaveBeenCalledWith(
        '409 Conflict - mutation conflicts with server state',
        expect.objectContaining({
          endpoint: '/api/notes/123',
          method: 'put',
        })
      );
    });
  });
});
