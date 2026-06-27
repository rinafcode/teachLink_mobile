import {
  evaluateFlag,
  EvaluationContext,
  FlagDefinition,
  FlagsResponse,
} from '../../services/featureFlagService';
import {
  initializeFeatureFlags,
  useFeatureFlagStore,
} from '../../store/featureFlagStore';

jest.mock('../../services/featureFlagService', () => {
  const actual = jest.requireActual('../../services/featureFlagService');
  return {
    ...actual,
    fetchRemoteFlags: jest.fn(),
  };
});

const { fetchRemoteFlags } = require('../../services/featureFlagService');

const getStore = () => useFeatureFlagStore.getState();

const mockRemoteResponse: FlagsResponse = {
  version: '1.0.0',
  updatedAt: '2025-01-15T00:00:00Z',
  flags: {
    newCheckout: { enabled: true },
    darkMode: { percentage: 50 },
    betaFeature: { enabled: false },
    iosOnly: { includedDeviceTypes: ['ios'] },
    androidOnly: { includedDeviceTypes: ['android'] },
    vipUsers: { includedUserIds: ['vip-001', 'vip-002'] },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (fetchRemoteFlags as jest.Mock).mockResolvedValue(null);

  useFeatureFlagStore.setState({
    flags: { version: '0.0.0', updatedAt: '', flags: {} },
    lastFetchedAt: null,
    fetchError: null,
    isPolling: false,
    context: {
      userId: 'user-123',
      deviceType: 'ios',
      appVersion: '1.15.0',
    },
  });
});

describe('featureFlagStore', () => {
  describe('isEnabled', () => {
    it('returns defaultValue when flag does not exist', () => {
      expect(getStore().isEnabled('nonexistent', true)).toBe(true);
      expect(getStore().isEnabled('nonexistent', false)).toBe(false);
      expect(getStore().isEnabled('nonexistent')).toBe(false);
    });

    it('respects enabled boolean from flags', async () => {
      (fetchRemoteFlags as jest.Mock).mockResolvedValue(mockRemoteResponse);
      await getStore().refresh();

      expect(getStore().isEnabled('newCheckout')).toBe(true);
      expect(getStore().isEnabled('betaFeature')).toBe(false);
    });

    it('falls back to defaultValue when flag key is missing', () => {
      useFeatureFlagStore.setState({
        flags: { version: '1.0', updatedAt: '', flags: { onlyThis: { enabled: true } } },
      });

      expect(getStore().isEnabled('missingFlag', true)).toBe(true);
      expect(getStore().isEnabled('missingFlag', false)).toBe(false);
    });

    it('evaluates device type targeting', () => {
      useFeatureFlagStore.setState({
        flags: { ...mockRemoteResponse, flags: { ...mockRemoteResponse.flags } },
        context: { deviceType: 'ios', appVersion: '1.15.0' },
      });

      expect(getStore().isEnabled('iosOnly')).toBe(true);
      expect(getStore().isEnabled('androidOnly')).toBe(false);
    });

    it('evaluates user ID targeting', () => {
      useFeatureFlagStore.setState({
        flags: { ...mockRemoteResponse, flags: { ...mockRemoteResponse.flags } },
        context: { userId: 'vip-001', deviceType: 'ios', appVersion: '1.15.0' },
      });

      expect(getStore().isEnabled('vipUsers')).toBe(true);

      useFeatureFlagStore.setState({
        context: { userId: 'regular-user', deviceType: 'ios', appVersion: '1.15.0' },
      });

      expect(getStore().isEnabled('vipUsers')).toBe(false);
    });
  });

  describe('refresh', () => {
    it('updates flags from remote', async () => {
      (fetchRemoteFlags as jest.Mock).mockResolvedValue(mockRemoteResponse);

      await getStore().refresh();

      expect(getStore().flags.flags.newCheckout).toEqual({ enabled: true });
      expect(getStore().lastFetchedAt).not.toBeNull();
      expect(getStore().fetchError).toBeNull();
    });

    it('sets fetchError when remote fetch fails', async () => {
      (fetchRemoteFlags as jest.Mock).mockRejectedValue(new Error('Network error'));

      await getStore().refresh();

      expect(getStore().fetchError).toBe('Network error');
    });

    it('merges remote flags over existing flags', async () => {
      useFeatureFlagStore.setState({
        flags: {
          version: '0.0.0',
          updatedAt: '',
          flags: { existingFlag: { enabled: false } },
        },
      });

      (fetchRemoteFlags as jest.Mock).mockResolvedValue({
        version: '1.0.0',
        updatedAt: '',
        flags: { existingFlag: { enabled: true } },
      });

      await getStore().refresh();

      expect(getStore().isEnabled('existingFlag')).toBe(true);
    });

    it('preserves flags not present in remote response', async () => {
      useFeatureFlagStore.setState({
        flags: {
          version: '0.0.0',
          updatedAt: '',
          flags: { onlyLocal: { enabled: true } },
        },
      });

      (fetchRemoteFlags as jest.Mock).mockResolvedValue({
        version: '1.0.0',
        updatedAt: '',
        flags: { remoteOnly: { enabled: true } },
      });

      await getStore().refresh();

      expect(getStore().isEnabled('onlyLocal')).toBe(true);
      expect(getStore().isEnabled('remoteOnly')).toBe(true);
    });
  });

  describe('setContext', () => {
    it('merges partial context updates', () => {
      getStore().setContext({ userId: 'new-user-456' });

      expect(getStore().context.userId).toBe('new-user-456');
      expect(getStore().context.deviceType).toBe('ios');
      expect(getStore().context.appVersion).toBe('1.15.0');
    });
  });

  describe('getDefinition', () => {
    it('returns definition for existing flag', () => {
      useFeatureFlagStore.setState({
        flags: { ...mockRemoteResponse, flags: { ...mockRemoteResponse.flags } },
      });

      expect(getStore().getDefinition('newCheckout')).toEqual({ enabled: true });
    });

    it('returns undefined for missing flag', () => {
      expect(getStore().getDefinition('nonexistent')).toBeUndefined();
    });
  });

  describe('polling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      getStore().stopPolling();
    });

    it('sets isPolling to true when started', () => {
      getStore().startPolling();
      expect(getStore().isPolling).toBe(true);
    });

    it('does not create duplicate timers', () => {
      getStore().startPolling();
      getStore().startPolling();
      expect(getStore().isPolling).toBe(true);
    });

    it('sets isPolling to false when stopped', () => {
      getStore().startPolling();
      getStore().stopPolling();
      expect(getStore().isPolling).toBe(false);
    });

    it('calls refresh on each interval tick', async () => {
      (fetchRemoteFlags as jest.Mock).mockResolvedValue(mockRemoteResponse);

      getStore().startPolling();

      jest.advanceTimersByTime(15 * 60 * 1000);
      await Promise.resolve();

      expect(fetchRemoteFlags).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(15 * 60 * 1000);
      await Promise.resolve();

      expect(fetchRemoteFlags).toHaveBeenCalledTimes(2);
    });
  });

  describe('initializeFeatureFlags', () => {
    it('fetches flags and starts polling', async () => {
      (fetchRemoteFlags as jest.Mock).mockResolvedValue(mockRemoteResponse);

      await initializeFeatureFlags();

      expect(getStore().flags.flags.newCheckout).toEqual({ enabled: true });
      expect(getStore().isPolling).toBe(true);

      getStore().stopPolling();
    });
  });
});
