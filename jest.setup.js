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
  Modal: 'Modal',
  SafeAreaView: 'SafeAreaView',
  ScrollView: 'ScrollView',
  Switch: 'Switch',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
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

// Mock expo-secure-store to avoid ESM issues
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
  deviceName: 'Test Device',
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

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaConsumer: ({ children }) => children({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

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

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
  deviceName: 'Test Device',
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
