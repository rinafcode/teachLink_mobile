/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('../../utils/logger', () => ({
  appLogger: {
    warn: jest.fn(),
  },
  default: {
    error: jest.fn(),
  },
}));

jest.mock('../../services/sentryContext', () => ({
  sentryContextService: {
    captureMessage: jest.fn(),
  },
}));

const getAsyncStorage = () =>
  require('@react-native-async-storage/async-storage') as {
    getItem: jest.Mock;
    setItem: jest.Mock;
    removeItem: jest.Mock;
  };

const getLogger = () =>
  require('../../utils/logger') as {
    appLogger: {
      warn: jest.Mock;
    };
  };

const getSentryContext = () =>
  require('../../services/sentryContext') as {
    sentryContextService: {
      captureMessage: jest.Mock;
    };
  };

const flushHydration = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('Zustand hydration recovery', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('resets ui store to defaults when persisted JSON is malformed', async () => {
    getAsyncStorage().getItem.mockResolvedValue('{malformed-json');

    const { useUiStore } = require('../../store/uiStore');
    await useUiStore.persist.rehydrate();
    await flushHydration();

    expect(useUiStore.getState().theme).toBe('light');
    expect(getLogger().appLogger.warn).toHaveBeenCalledWith(
      'Zustand persisted store hydration failed; reset to defaults',
      expect.objectContaining({ storeName: 'ui-storage' })
    );
    expect(getSentryContext().sentryContextService.captureMessage).toHaveBeenCalledWith(
      'Zustand persisted store hydration failed',
      'warning',
      expect.objectContaining({
        tags: expect.objectContaining({ storeName: 'ui-storage' }),
      })
    );
  });

  it('resets settings store to defaults when persisted JSON is malformed', async () => {
    getAsyncStorage().getItem.mockResolvedValue('{malformed-json');

    const { useSettingsStore } = require('../../store/settingsStore');
    await useSettingsStore.persist.rehydrate();
    await flushHydration();

    const state = useSettingsStore.getState();
    expect(state.profileVisibility).toBe('public');
    expect(state.analyticsEnabled).toBe(true);
    expect(state.dataSaverEnabled).toBe(false);
    expect(getLogger().appLogger.warn).toHaveBeenCalledWith(
      'Zustand persisted store hydration failed; reset to defaults',
      expect.objectContaining({ storeName: 'settings-storage' })
    );
    expect(getSentryContext().sentryContextService.captureMessage).toHaveBeenCalledWith(
      'Zustand persisted store hydration failed',
      'warning',
      expect.objectContaining({
        tags: expect.objectContaining({ storeName: 'settings-storage' }),
      })
    );
  });

  it('resets course progress store to defaults and queues one toast after malformed JSON', async () => {
    getAsyncStorage().getItem.mockResolvedValue('{malformed-json');

    const { useCourseProgressStore } = require('../../store/courseProgressStore');
    const {
      consumeHydrationResetToast,
      resetHydrationRecoveryForTests,
    } = require('../../store/persistence');

    resetHydrationRecoveryForTests();
    await useCourseProgressStore.persist.rehydrate();
    await flushHydration();

    expect(useCourseProgressStore.getState().progressMap).toEqual({});
    expect(consumeHydrationResetToast()).toBe(true);
    expect(consumeHydrationResetToast()).toBe(false);
    expect(getLogger().appLogger.warn).toHaveBeenCalledWith(
      'Zustand persisted store hydration failed; reset to defaults',
      expect.objectContaining({ storeName: 'course-progress-storage' })
    );
    expect(getSentryContext().sentryContextService.captureMessage).toHaveBeenCalledWith(
      'Zustand persisted store hydration failed',
      'warning',
      expect.objectContaining({
        tags: expect.objectContaining({ storeName: 'course-progress-storage' }),
      })
    );
  });
});
