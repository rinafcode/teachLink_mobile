import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiService } from '../../services/api';
import {
  FeatureFlagsConfig,
  getFeatureFlagConfig,
  initializeFeatureFlags,
  isFeatureEnabled,
  refreshFeatureFlags,
  resetFeatureFlags,
  subscribeFeatureFlagUpdates,
  updateFeatureFlags,
} from '../../services/featureFlags';

jest.mock('../../services/api', () => ({
  apiService: {
    get: jest.fn(),
  },
}));

describe('Feature flag service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await resetFeatureFlags();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('returns false for undefined flags', () => {
    expect(isFeatureEnabled('missing-feature')).toBe(false);
  });

  it('enables feature for explicitly included user', () => {
    updateFeatureFlags({
      flags: {
        newExperience: {
          enabled: false,
          includedUsers: ['user-123'],
        },
      },
    });

    expect(isFeatureEnabled('newExperience', { userId: 'user-123' })).toBe(true);
    expect(isFeatureEnabled('newExperience', { userId: 'other-user' })).toBe(false);
  });

  it('enables feature for matching region', () => {
    updateFeatureFlags({
      flags: {
        regionLaunch: {
          enabled: false,
          includedRegions: ['US', 'CA'],
        },
      },
    });

    expect(isFeatureEnabled('regionLaunch', { region: 'us' })).toBe(true);
    expect(isFeatureEnabled('regionLaunch', { region: 'de' })).toBe(false);
  });

  it('honors percentage rollout deterministically for the same user', () => {
    updateFeatureFlags({
      flags: {
        gradualFeature: {
          enabled: false,
          percentage: 50,
        },
      },
    });

    const first = isFeatureEnabled('gradualFeature', { userId: 'user-1' });
    const second = isFeatureEnabled('gradualFeature', { userId: 'user-1' });

    expect(first).toBe(second);
  });

  it('refreshes remote flags and notifies subscribers', async () => {
    const remoteConfig: FeatureFlagsConfig = {
      version: '1.0',
      updatedAt: new Date().toISOString(),
      flags: {
        testFeature: {
          enabled: true,
        },
      },
    };

    (apiService.get as jest.Mock).mockResolvedValue({ data: remoteConfig });

    let notified = false;
    const unsubscribe = subscribeFeatureFlagUpdates(() => {
      notified = true;
    });

    await refreshFeatureFlags();

    expect(getFeatureFlagConfig().flags.testFeature?.enabled).toBe(true);
    expect(notified).toBe(true);
    unsubscribe();
  });

  it('loads persisted flags during initialization', async () => {
    const persisted: FeatureFlagsConfig = {
      version: 'persisted',
      flags: {
        persistedFeature: { enabled: true },
      },
    };
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'teachlink_feature_flags') {
        return Promise.resolve(JSON.stringify(persisted));
      }
      return Promise.resolve(null);
    });

    // Mock remote fetch to avoid network call during init
    (apiService.get as jest.Mock).mockRejectedValue(new Error('Network unavailable'));

    await initializeFeatureFlags();

    expect(getFeatureFlagConfig().flags.persistedFeature?.enabled).toBe(true);
  });
});
