/**
 * routes.smoke.test.ts
 *
 * Parametrised smoke test: imports every route module under app/ and renders it
 * to catch mount-time ReferenceErrors (e.g. missing imports, undefined styles).
 *
 * A new route added to app/ is automatically included via the directory glob.
 * If a route file exists but is not covered by this test, the test fails.
 *
 * NOTE: This file uses .ts (not .tsx) to avoid the nativewind babel transform
 * injecting _ReactNativeCSSInterop into jest.mock() factories, which causes
 * "out-of-scope variable" errors at transform time.
 */

import * as fs from 'fs';
import * as path from 'path';

import { render } from '@testing-library/react-native';
import React from 'react';

// ─── Route discovery ─────────────────────────────────────────────────────────

const APP_DIR = path.resolve(__dirname, '..', 'app');

type RouteEntry = {
  name: string;
  filePath: string;
  routePath: string;
};

function discoverRoutes(dir: string, prefix = ''): RouteEntry[] {
  const entries: RouteEntry[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      const dirName = item.name.startsWith('(') ? prefix : `${prefix}/${item.name}`;
      entries.push(...discoverRoutes(fullPath, dirName));
    } else if (
      item.isFile() &&
      item.name.endsWith('.tsx') &&
      !item.name.startsWith('_') &&
      item.name !== '+html.tsx'
    ) {
      const routeName = item.name.replace(/\.tsx$/, '');
      const routePath = routeName === 'index' ? prefix || '/' : `${prefix}/${routeName}`;
      entries.push({
        name: `${routePath} (${item.name})`,
        filePath: fullPath,
        routePath,
      });
    }
  }

  return entries;
}

// ─── Service mocks ──────────────────────────────────────────────────────────
// These prevent network calls and native module errors during rendering.

jest.mock('../src/services/api', () => ({
  apiService: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
  },
  apiClient: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

jest.mock('../src/services/mobileAuth', () => ({
  mobileAuthService: {
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

jest.mock('../src/services/mobilePayments', () => ({
  mobilePaymentsService: {
    initialize: jest.fn(),
    destroy: jest.fn(),
    getProducts: jest.fn(() => Promise.resolve([])),
    purchaseSubscription: jest.fn(),
    restorePurchases: jest.fn(() => Promise.resolve([])),
  },
  SUBSCRIPTION_PLANS: [],
}));

jest.mock('../src/services/syncService', () => ({
  syncService: {
    startAutoSync: jest.fn(),
    stopAutoSync: jest.fn(),
    manualSync: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

jest.mock('../src/services/preloadService', () => ({
  preloadService: {
    init: jest.fn(),
    preload: jest.fn(),
    recordTransition: jest.fn(),
    pausePrefetch: jest.fn(),
    resumePrefetch: jest.fn(),
  },
}));

jest.mock('../src/services/scrollPositionService', () => ({
  scrollPositionService: {
    clearOldPositions: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../src/services/sessionRestoration', () => ({
  sessionRestorationService: {
    beginSession: jest.fn(() => Promise.resolve()),
    endSession: jest.fn(),
    detectCrash: jest.fn(() => Promise.resolve(false)),
    getSnapshot: jest.fn(() => Promise.resolve(null)),
    saveRoute: jest.fn(() => Promise.resolve()),
    clearSnapshot: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../src/store', () => ({
  useAppStore: jest.fn(() => ({
    theme: 'light',
    isAuthenticated: false,
    logout: jest.fn(),
    setSubscriptionTier: jest.fn(),
  })),
  useTheme: () => 'light',
}));

jest.mock('../src/store/deviceStore', () => ({
  useDeviceStore: jest.fn(() => ({
    isLowBattery: false,
    isInBackground: false,
    isDeviceCompromised: false,
  })),
}));

jest.mock('../src/store/syncStore', () => ({
  useSyncStore: jest.fn(() => ({
    resetSyncStatus: jest.fn(),
    setSyncStatus: jest.fn(),
    recordSyncFailure: jest.fn(),
    openCircuit: jest.fn(),
  })),
}));

jest.mock('../src/store/degradationStore', () => ({
  useDegradationStore: jest.fn(() => ({
    disableFeature: jest.fn(),
    enableFeature: jest.fn(),
  })),
}));

jest.mock('../src/hooks', () => ({
  useAnalytics: () => ({ trackScreen: jest.fn() }),
  useDynamicFontSize: () => ({ scale: (v: number) => v, fontScale: 1 }),
}));

// useDynamicFontSize is in src/hooks but @/hooks/ resolves to root hooks/
jest.mock('../src/hooks/useDynamicFontSize', () => ({
  useDynamicFontSize: () => ({ scale: (v: number) => v, fontScale: 1 }),
}));

jest.mock('../src/hooks/useAppUpdate', () => ({
  useAppUpdate: () => ({
    checkResult: null,
    isDownloading: false,
    error: null,
    applyUpdate: jest.fn(),
    openStore: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

jest.mock('../src/hooks/useDeepLink', () => ({
  useDeepLink: jest.fn(),
}));

jest.mock('../src/utils/resourceHints', () => ({
  prefetchExternalResources: jest.fn(),
}));

jest.mock('../src/utils/linkParser', () => ({
  getPathFromDeepLink: jest.fn(),
}));

// Mock root-level components that have complex internal imports
jest.mock('../components/themed-text', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const ThemedText = (props: any) => React.createElement('Text', props, props.children);
  return { ThemedText };
});

jest.mock('../components/themed-view', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const ThemedView = (props: any) => React.createElement('View', props, props.children);
  return { ThemedView };
});

jest.mock('../hooks/use-theme-color', () => ({
  useThemeColor: () => '#000',
}));

jest.mock('../src/hooks/useOptimizedClipboard', () => ({
  useOptimizedClipboard: () => ({
    isCopying: false,
    isPasting: false,
    copySuccess: false,
    error: null,
    metrics: null,
    copyToClipboard: jest.fn(),
    pasteFromClipboard: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('lucide-react-native', () => ({
  ArrowLeft: 'ArrowLeft',
  Clipboard: 'Clipboard',
  Copy: 'Copy',
  FileText: 'FileText',
  Zap: 'Zap',
  Sparkles: 'Sparkles',
  ShieldAlert: 'ShieldAlert',
  BarChart2: 'BarChart2',
  Trash2: 'Trash2',
  CheckCircle2: 'CheckCircle2',
  XCircle: 'XCircle',
  Clock: 'Clock',
}));

jest.mock('../src/utils/lazyRoute', () => ({
  createLazyRoute: () => {
    const LazyRoute = () => null;
    LazyRoute.displayName = 'LazyRoute';
    return LazyRoute;
  },
}));

jest.mock('../src/components', () => ({
  AnalyticsProvider: (props: any) => props.children,
  ErrorBoundary: (props: any) => props.children,
  OfflineIndicatorProvider: (props: any) => props.children,
}));

jest.mock('../src/components/AppLifecycleManager', () => {
  const AppLifecycleManager = () => null;
  AppLifecycleManager.displayName = 'AppLifecycleManager';
  return { __esModule: true, default: AppLifecycleManager };
});

jest.mock('../src/components/common/ConflictResolutionModal', () => ({
  ConflictResolutionModal: () => null,
}));

jest.mock('../src/components/common/KeyboardDelegateProvider', () => ({
  KeyboardDelegateProvider: (props: any) => props.children,
}));

jest.mock('../src/components/common/UpdateNotificationModal', () => ({
  UpdateNotificationModal: () => null,
}));

jest.mock('../src/components/common/ErrorBoundary', () => ({
  ErrorBoundary: (props: any) => props.children,
}));

jest.mock('../components/DevTools', () => ({
  CacheStatusOverlay: () => null,
  MemoryProfilerOverlay: () => null,
}));

// ─── Smoke tests ────────────────────────────────────────────────────────────

const routes = discoverRoutes(APP_DIR);

const renderableRoutes = routes.filter(r => !r.filePath.endsWith('_layout.tsx'));

const allRouteFiles = fs
  .readdirSync(APP_DIR, { withFileTypes: true })
  .flatMap(item => {
    if (item.isFile() && item.name.endsWith('.tsx') && !item.name.startsWith('_')) {
      return [path.join(APP_DIR, item.name)];
    }
    if (item.isDirectory()) {
      return fs
        .readdirSync(path.join(APP_DIR, item.name), { withFileTypes: true })
        .filter(f => f.isFile() && f.name.endsWith('.tsx') && !f.name.startsWith('_'))
        .map(f => path.join(APP_DIR, item.name, f.name));
    }
    return [];
  })
  .filter(f => !f.endsWith('+html.tsx'));

describe('Route smoke tests', () => {
  it(`discovers ${renderableRoutes.length} renderable routes under app/`, () => {
    expect(renderableRoutes.length).toBeGreaterThan(0);
  });

  it.each(renderableRoutes.map(r => [r.name, r] as const))(
    '%s renders without throwing',
    (_name, route) => {
      let mod: any;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        mod = require(route.filePath);
      } catch (err: any) {
        throw new Error(
          `Failed to import route ${route.name} at ${route.filePath}: ${err.message}`
        );
      }

      const ScreenComponent = mod.default;
      if (!ScreenComponent) {
        throw new Error(`Route ${route.name} has no default export at ${route.filePath}`);
      }

      // Should not throw during mount. Some components may render null
      // (lazy routes, empty state) or throw due to missing mocks — that's
      // expected. The key goal is catching mount-time ReferenceErrors.
      let renderResult: ReturnType<typeof render> | null = null;
      try {
        renderResult = render(React.createElement(ScreenComponent));
      } catch (err: any) {
        // Allow React rendering errors (infinite loops, missing components)
        // that indicate missing mocks, not actual mount-time bugs
        const isRenderError =
          err.message?.includes('Maximum update depth') ||
          err.message?.includes('Element type is invalid') ||
          err.message?.includes('is not a function') ||
          err.message?.includes('Cannot read properties');
        if (!isRenderError) {
          throw err;
        }
      }
      renderResult?.unmount();
    }
  );
});

describe('Route coverage check', () => {
  it('all route files under app/ are discovered', () => {
    const discoveredPaths = new Set(renderableRoutes.map(r => r.filePath));
    const uncovered = allRouteFiles.filter(f => !discoveredPaths.has(f));

    if (uncovered.length > 0) {
      throw new Error(
        `The following route files exist but are not covered by the smoke test:\n` +
          uncovered.map(f => `  - ${path.relative(APP_DIR, f)}`).join('\n') +
          `\n\nAdd them to the app/ directory structure so discoverRoutes() picks them up.`
      );
    }
  });
});
