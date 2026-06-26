/* global jest */

// Global mock for react-native to support tests
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn(obj => obj.ios) },
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    openSettings: jest.fn(() => Promise.resolve()),
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Modal: 'Modal',
  SafeAreaView: 'SafeAreaView',
  ScrollView: 'ScrollView',
  Switch: 'Switch',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
  Pressable: 'Pressable',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  StyleSheet: {
    create: styles => styles,
    flatten: style => (style ? (Array.isArray(style) ? Object.assign({}, ...style) : style) : {}),
    hairlineWidth: 1,
    absoluteFill: {},
    absoluteFillObject: {},
  },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1, scale: 1 }),
  useColorScheme: () => 'light',
  Appearance: {
    getColorScheme: () => 'light',
    addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
    removeChangeListener: jest.fn(),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
  Dimensions: {
    get: () => ({ width: 390, height: 844 }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Animated: {
    View: 'Animated.View',
    Text: 'Animated.Text',
    Image: 'Animated.Image',
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      interpolate: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      stopAnimation: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn(callback => callback && callback({ finished: true })),
      stop: jest.fn(),
    })),
    spring: jest.fn(() => ({
      start: jest.fn(callback => callback && callback({ finished: true })),
      stop: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn(callback => callback && callback({ finished: true })),
      stop: jest.fn(),
    })),
    loop: jest.fn(() => ({
      start: jest.fn(callback => callback && callback({ finished: true })),
      stop: jest.fn(),
    })),
    createAnimatedComponent: jest.fn(component => component),
  },
  Alert: { alert: jest.fn() },
  Keyboard: { avoidView: 'KeyboardAvoidingView', dismiss: jest.fn() },
  FlatList: 'FlatList',
  SectionList: 'SectionList',
  StatusBar: 'StatusBar',
  RefreshControl: 'RefreshControl',
  PixelRatio: { get: () => 2 },
  I18nManager: { isRTL: false, allowRTL: jest.fn() },
  findNodeHandle: jest.fn(),
  UIManager: {
    measure: jest.fn(),
    measureLayout: jest.fn(),
    measureInWindow: jest.fn(),
    getViewManagerConfig: jest.fn(() => ({})),
  },
  NativeModules: {
    UIManager: { getViewManagerConfig: jest.fn(() => ({})) },
  },
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: jest.fn((event, handler) => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
  InteractionManager: { runAfterInteractions: jest.fn(cb => cb()) },
}));

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Provide required env vars for modules that read them at import time
process.env.EXPO_PUBLIC_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.example.com';
process.env.EXPO_PUBLIC_SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || 'wss://socket.example.com';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

// Mock Sentry for native-less Jest environment
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setTag: jest.fn(),
  setUser: jest.fn(),
  configureScope: jest.fn(fn => fn && fn({})),
  withScope: jest.fn(fn => fn && fn({})),
  NativeModules: {
    RNSentry: {},
  },
}));

// Mock expo-secure-store to avoid ESM issues
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-device.  __esModule: true prevents Babel's _interopRequireWildcard
// from copying values at import time, so tests can mutate properties directly.
jest.mock('expo-device', () => ({
  __esModule: true,
  isDevice: true,
  deviceName: 'Test Device',
  deviceYearClass: 2021,
  totalMemory: 4 * 1024 * 1024 * 1024, // 4 GB — high-end default
  modelName: 'Test Model',
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test-project-id',
      },
    },
  },
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn(path => `teachlink://${path}`),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

// Mock expo-network to avoid native module dependency in Jest
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'WIFI',
    })
  ),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  NetworkStateType: {
    UNKNOWN: 0,
    NONE: 1,
    CELLULAR: 2,
    WIFI: 3,
  },
}));

// Mock expo-image-picker to avoid native module dependency in Jest
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true })
  ),
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true })
  ),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: null })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: null })),
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },
}));

// Mock expo-haptics to avoid Expo runtime registration in Jest
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
    Rigid: 'Rigid',
    Soft: 'Soft',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

// Mock react-native-iap (depends on NitroModules in native runtime)
jest.mock('react-native-iap', () => ({
  initConnection: jest.fn(() => Promise.resolve(true)),
  endConnection: jest.fn(),
  getProducts: jest.fn(() => Promise.resolve([])),
  getSubscriptions: jest.fn(() => Promise.resolve([])),
  requestPurchase: jest.fn(() => Promise.resolve({})),
  requestSubscription: jest.fn(() => Promise.resolve({})),
  finishTransaction: jest.fn(() => Promise.resolve(true)),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  getAvailablePurchases: jest.fn(() => Promise.resolve([])),
}));

// Mock expo-image to avoid native view manager requirement in Jest
jest.mock('expo-image', () => ({
  Image: 'ExpoImage',
  prefetch: jest.fn(() => Promise.resolve(true)),
  clearMemoryCache: jest.fn(() => Promise.resolve()),
  clearDiskCache: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-safe-area-context', () => {
  const mockComponent = name => {
    const Comp = ({ children }) => children;
    Comp.displayName = name;
    return Comp;
  };
  return new Proxy(
    {
      SafeAreaProvider: mockComponent('SafeAreaProvider'),
      SafeAreaConsumer: ({ children }) => children({ top: 0, right: 0, bottom: 0, left: 0 }),
      useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
      useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
      SafeAreaView: mockComponent('SafeAreaView'),
    },
    {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        if (typeof prop === 'symbol') return undefined;
        return mockComponent(String(prop));
      },
    }
  );
});

// Mock expo-notifications (override jest-expo's mock to add removed methods)
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'undetermined' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: 'ExponentPushToken[test-token-123]' })
  ),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(), // deprecated but used in codebase
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
}));

// Mock expo-battery
jest.mock('expo-battery', () => ({
  BatteryState: {
    UNKNOWN: 0,
    UNPLUGGED: 1,
    CHARGING: 2,
    FULL: 3,
  },
  useLowPowerMode: jest.fn(() => false),
  isLowPowerModeEnabledAsync: jest.fn(() => Promise.resolve(false)),
  getBatteryLevelAsync: jest.fn(() => Promise.resolve(1)),
  getPowerStateAsync: jest.fn(() =>
    Promise.resolve({ batteryLevel: 1, batteryState: 1, lowPowerMode: false })
  ),
  addLowPowerModeListener: jest.fn(() => ({ remove: jest.fn() })),
  BatteryState: {
    UNKNOWN: 0,
    UNPLUGGED: 1,
    CHARGING: 2,
    FULL: 3,
  },
}));

// Lightweight mock for expo-router to avoid pulling in navigation internals during tests
jest.mock(
  'expo-router',
  () => ({
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
    }),
    Link: ({ children }) => children,
    useLocalSearchParams: () => ({}),
    usePathname: () => '/',
    useSegments: () => [],
  }),
  { virtual: true }
);

// Mock expo-document-picker and expo-file-system used by components/tests
jest.mock(
  'expo-document-picker',
  () => ({
    getDocumentAsync: jest.fn(() => Promise.resolve({ type: 'cancelled' })),
    getDocumentsAsync: jest.fn(() => Promise.resolve([])),
  }),
  { virtual: true }
);

jest.mock(
  'expo-file-system',
  () => ({
    documentDirectory: '/tmp/',
    readAsStringAsync: jest.fn(() => Promise.resolve('')),
    writeAsStringAsync: jest.fn(() => Promise.resolve()),
    deleteAsync: jest.fn(() => Promise.resolve()),
  }),
  { virtual: true }
);

// Mock @sentry/react-native to prevent Jest environment failure
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: jest.fn(component => component),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  clearBreadcrumbs: jest.fn(),
  addBreadcrumb: jest.fn(),
  ReactNavigationInstrumentation: jest.fn(),
  ReactNativeTracing: jest.fn(),
  Native: {
    RNSentry: {},
  },
  SDK_NAME: 'sentry.javascript.react-native',
  SDK_VERSION: '5.36.0',
}));

// Mock expo-sensors globally to avoid native device sensor requirements in Jest
jest.mock('expo-sensors', () => ({
  LightSensor: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeAllListeners: jest.fn(),
    setUpdateInterval: jest.fn(),
    isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  },
}));

// Mock react-native-safe-area-context to prevent css-interop Safe Area Provider errors in tests
jest.mock('react-native-safe-area-context', () => {
  const RN = require('react-native');
  return {
    SafeAreaProvider: RN.View,
    SafeAreaView: RN.View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// Mock react-native-reanimated with a stable custom lightweight implementation globally
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    default: RN.Animated,
    View: RN.View,
    Text: RN.Text,
    ScrollView: RN.ScrollView,
    Image: RN.Image,
    useSharedValue: val => ({ value: val }),
    useAnimatedStyle: fn => fn(),
    withSpring: val => val,
    withTiming: (val, config, callback) => {
      if (callback) {
        callback(true);
      }
      return val;
    },
    runOnJS: fn => fn,
  };
});

// Mock react-native-gesture-handler globally
jest.mock('react-native-gesture-handler', () => {
  const RN = require('react-native');
  return {
    Gesture: {
      Pan: () => ({
        activeOffsetX: jest.fn().mockReturnThis(),
        failOffsetY: jest.fn().mockReturnThis(),
        onStart: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
        onFinalize: jest.fn().mockReturnThis(),
      }),
      LongPress: () => ({
        minDuration: jest.fn().mockReturnThis(),
        maxDist: jest.fn().mockReturnThis(),
        onStart: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
        onFinalize: jest.fn().mockReturnThis(),
      }),
      Pinch: () => ({
        onStart: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
        onFinalize: jest.fn().mockReturnThis(),
      }),
      Simultaneous: RN.View,
    },
    GestureDetector: RN.View,
    Swipeable: RN.View,
    gestureHandlerRootHOC: jest.fn(c => c),
  };
});

// Mock react-native-svg globally to resolve SvgTouchableMixin errors
jest.mock('react-native-svg', () => {
  const RN = require('react-native');
  return {
    default: RN.View,
    Svg: RN.View,
    Path: RN.View,
    Rect: RN.View,
    Circle: RN.View,
  };
});

// Mock expo-store-review for in-app review tests
jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  requestReview: jest.fn(() => Promise.resolve()),
  hasAction: jest.fn(() => Promise.resolve(true)),
  storeUrl: jest.fn(() => Promise.resolve('https://apps.apple.com/app/teachlink/id1234567890')),
}));
