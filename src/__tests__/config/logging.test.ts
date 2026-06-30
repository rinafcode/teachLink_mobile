import * as Sentry from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiRemove: jest.fn(),
}));

jest.mock('../../services/sentryContext', () => ({
  sentryContextService: {
    getCurrentScreen: jest.fn(() => null),
    buildCaptureContext: jest.fn(() => ({})),
    setUser: jest.fn(),
    clearUser: jest.fn(),
    resetSession: jest.fn(),
  },
}));

jest.mock('../../utils/storage', () => ({
  safeStorageWrite: jest.fn(),
}));

// ─── beforeBreadcrumb PII scrubbing ───────────────────────────────────────

let capturedBeforeBreadcrumb: ((b: Sentry.Breadcrumb) => Sentry.Breadcrumb | null) | null = null;

(Sentry.init as jest.Mock).mockImplementation(
  (options: { beforeBreadcrumb?: (b: Sentry.Breadcrumb) => Sentry.Breadcrumb | null }) => {
    capturedBeforeBreadcrumb = options.beforeBreadcrumb ?? null;
  }
);

describe('beforeBreadcrumb - PII scrubbing', () => {
  beforeAll(async () => {
    jest.resetModules();
    jest.doMock('@sentry/react-native', () => ({
      init: (opts: { beforeBreadcrumb?: (b: Sentry.Breadcrumb) => Sentry.Breadcrumb | null }) => {
        capturedBeforeBreadcrumb = opts.beforeBreadcrumb ?? null;
      },
      addBreadcrumb: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
    }));

    const original = (global as Record<string, unknown>).__DEV__;
    (global as Record<string, unknown>).__DEV__ = false;

    const { initializeLogging } = await import('../../config/logging');
    await initializeLogging();

    (global as Record<string, unknown>).__DEV__ = original;
  });

  function runBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
    if (!capturedBeforeBreadcrumb) throw new Error('beforeBreadcrumb not captured');
    return capturedBeforeBreadcrumb(breadcrumb);
  }

  it('redacts password field in xhr breadcrumb body', () => {
    const result = runBreadcrumb({
      type: 'xhr',
      data: { body: { password: 'secret123', courseId: 'abc' } },
    });
    expect(result?.data?.body.password).toBe('[REDACTED]');
    expect(result?.data?.body.courseId).toBe('abc');
  });

  it('redacts all sensitive fields in request.data', () => {
    const result = runBreadcrumb({
      type: 'http',
      data: {
        request: {
          data: {
            email: 'user@example.com',
            newPassword: 'hunter2',
            cardNumber: '4111111111111111',
            cvv: '123',
            page: 1,
          },
        },
      },
    });
    const d = result?.data?.request?.data;
    expect(d.email).toBe('[REDACTED]');
    expect(d.newPassword).toBe('[REDACTED]');
    expect(d.cardNumber).toBe('[REDACTED]');
    expect(d.cvv).toBe('[REDACTED]');
    expect(d.page).toBe(1);
  });

  it('redacts nested sensitive fields recursively', () => {
    const result = runBreadcrumb({
      type: 'xhr',
      data: {
        body: {
          user: { email: 'test@test.com', name: 'Alice' },
        },
      },
    });
    expect(result?.data?.body.user.email).toBe('[REDACTED]');
    expect(result?.data?.body.user.name).toBe('Alice');
  });

  it('does not scrub non-xhr/http breadcrumb types', () => {
    const result = runBreadcrumb({
      type: 'navigation',
      data: { body: { password: 'should-stay' } },
    });
    expect(result?.data?.body.password).toBe('should-stay');
  });

  it('strips token and access_token from URL query params', () => {
    const result = runBreadcrumb({
      type: 'http',
      data: { url: 'https://api.example.com/endpoint?token=abc&access_token=xyz&page=2' },
    });
    const url = new URL(result?.data?.url as string);
    expect(url.searchParams.has('token')).toBe(false);
    expect(url.searchParams.has('access_token')).toBe(false);
    expect(url.searchParams.get('page')).toBe('2');
  });

  it('preserves breadcrumbs with no sensitive data unchanged', () => {
    const result = runBreadcrumb({
      type: 'xhr',
      data: { body: { courseId: '42', page: 3 } },
    });
    expect(result?.data?.body).toEqual({ courseId: '42', page: 3 });
  });
});

// ─── initializeLogging Sentry init gating ─────────────────────────────────

function resetLoggingModule() {
  jest.resetModules();
  jest.mock('@sentry/react-native', () => ({
    init: jest.fn(),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    addBreadcrumb: jest.fn(),
    setTag: jest.fn(),
    setUser: jest.fn(),
    configureScope: jest.fn(),
    withScope: jest.fn(),
  }));
  jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiRemove: jest.fn(() => Promise.resolve()),
  }));
  jest.mock('../../services/sentryContext', () => ({
    sentryContextService: {
      buildCaptureContext: jest.fn(() => ({})),
      getCurrentScreen: jest.fn(() => null),
    },
  }));
  jest.mock('../../utils/storage', () => ({
    safeStorageWrite: jest.fn(),
  }));
}

async function importAndInit() {
  const mod = await import('../../config/logging');
  await mod.initializeLogging();
  return mod;
}

describe('initializeLogging - Sentry init gating', () => {
  const originalDev = (global as any).__DEV__;

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
    delete process.env.EXPO_PUBLIC_SENTRY_ENABLED;
  });

  it('does NOT call Sentry.init in a dev build without the env var', async () => {
    (global as any).__DEV__ = true;
    delete process.env.EXPO_PUBLIC_SENTRY_ENABLED;

    resetLoggingModule();
    await importAndInit();

    const { init } = require('@sentry/react-native');
    expect(init).not.toHaveBeenCalled();
  });

  it('DOES call Sentry.init in a dev build when EXPO_PUBLIC_SENTRY_ENABLED=true', async () => {
    (global as any).__DEV__ = true;
    process.env.EXPO_PUBLIC_SENTRY_ENABLED = 'true';

    resetLoggingModule();
    await importAndInit();

    const { init } = require('@sentry/react-native');
    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ environment: 'staging' }));
  });

  it('DOES call Sentry.init in a production build regardless of env var', async () => {
    (global as any).__DEV__ = false;
    delete process.env.EXPO_PUBLIC_SENTRY_ENABLED;

    resetLoggingModule();
    await importAndInit();

    const { init } = require('@sentry/react-native');
    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ environment: 'production' }));
  });

  it('DOES call Sentry.init in production even when env var is explicitly false', async () => {
    (global as any).__DEV__ = false;
    process.env.EXPO_PUBLIC_SENTRY_ENABLED = 'false';

    resetLoggingModule();
    await importAndInit();

    const { init } = require('@sentry/react-native');
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('does NOT call Sentry.init in dev when env var is explicitly false', async () => {
    (global as any).__DEV__ = true;
    process.env.EXPO_PUBLIC_SENTRY_ENABLED = 'false';

    resetLoggingModule();
    await importAndInit();

    const { init } = require('@sentry/react-native');
    expect(init).not.toHaveBeenCalled();
  });
});
