import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { NotificationPermissionExplanationSheet } from '../../src/components/mobile/NotificationPermissionExplanationSheet';
import { registerForPushNotifications } from '../../src/services/pushNotifications';
import { useNotificationStore } from '../../src/store/notificationStore';

jest.mock('../../src/services/pushNotifications', () => ({
  registerForPushNotifications: jest.fn(),
  registerTokenWithBackend: jest.fn(),
}));

jest.mock('../../src/hooks', () => ({
  useNotificationPermission: jest.fn(() => ({
    requestPermission: jest.fn().mockResolvedValue(true),
    isLoading: false,
    isDevice: true,
    openSettings: jest.fn(),
    permissionStatus: 'undetermined'
  })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

jest.mock('../../src/store/notificationStore', () => ({
  useNotificationStore: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(() => ({ isConnected: true })),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
}), { virtual: true });

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}), { virtual: true });

// Mock Gorhom BottomSheet
jest.mock('@gorhom/bottom-sheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const BottomSheetModal = React.forwardRef(({ children }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      present: jest.fn(),
      dismiss: jest.fn(),
    }));
    return <View testID="mock-bottom-sheet">{children}</View>;
  });
  BottomSheetModal.displayName = 'BottomSheetModal';
  
  return {
    __esModule: true,
    BottomSheetModal,
    BottomSheetView: ({ children }: any) => <View>{children}</View>,
    BottomSheetModalProvider: ({ children }: any) => <View>{children}</View>,
    BottomSheetBackdrop: () => <View />,
  };
});

// Mock the problematic hooks directory
jest.mock('../../hooks/useScrollRestoration', () => ({
  useScrollRestoration: jest.fn(),
}), { virtual: true });

jest.mock('../../hooks/useFlatListScrollRestoration', () => ({
  useFlatListScrollRestoration: jest.fn(),
}), { virtual: true });

describe('NotificationPermissionExplanationSheet', () => {
  const setShowNotificationExplainerMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const mockStore = (selector: any) => {
      const state = {
        showNotificationExplainer: false,
        setShowNotificationExplainer: setShowNotificationExplainerMock,
        setPushToken: jest.fn(),
        setTokenRegistered: jest.fn(),
      };
      return selector ? selector(state) : state;
    };
    mockStore.getState = () => mockStore(undefined);

    (useNotificationStore as unknown as jest.Mock).mockImplementation(mockStore);
  });

  it('renders Modal with visible=false when showNotificationExplainer is false', () => {
    const { toJSON } = render(<NotificationPermissionExplanationSheet />);
    const json = toJSON() as any;
    expect(json.props.visible).toBe(false);
  });

  it('renders content when showNotificationExplainer is true', () => {
    const mockStore = (selector: any) => {
      const state = {
        showNotificationExplainer: true,
        setShowNotificationExplainer: setShowNotificationExplainerMock,
        setPushToken: jest.fn(),
        setTokenRegistered: jest.fn(),
      };
      return selector ? selector(state) : state;
    };
    mockStore.getState = () => mockStore(undefined);
    (useNotificationStore as unknown as jest.Mock).mockImplementation(mockStore);

    const { getByText } = render(<NotificationPermissionExplanationSheet />);
    
    expect(getByText('Stay Updated')).toBeTruthy();
    expect(getByText('Enable Notifications')).toBeTruthy();
    expect(getByText('Not Now')).toBeTruthy();
  });

  it('handles "Enable Notifications" click correctly', async () => {
    const mockStore = (selector: any) => {
      const state = {
        showNotificationExplainer: true,
        setShowNotificationExplainer: setShowNotificationExplainerMock,
        setPushToken: jest.fn(),
        setTokenRegistered: jest.fn(),
      };
      return selector ? selector(state) : state;
    };
    mockStore.getState = () => mockStore(undefined);
    (useNotificationStore as unknown as jest.Mock).mockImplementation(mockStore);

    (registerForPushNotifications as jest.Mock).mockResolvedValue('mock-token');

    const { getByText } = render(<NotificationPermissionExplanationSheet />);
    
    fireEvent.press(getByText('Enable Notifications'));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('hasSeenNotificationExplainer', 'true');
      expect(setShowNotificationExplainerMock).toHaveBeenCalledWith(false);
    });
  });

  it('handles "Not Now" click correctly', async () => {
    const mockStore = (selector: any) => {
      const state = {
        showNotificationExplainer: true,
        setShowNotificationExplainer: setShowNotificationExplainerMock,
        setPushToken: jest.fn(),
        setTokenRegistered: jest.fn(),
      };
      return selector ? selector(state) : state;
    };
    mockStore.getState = () => mockStore(undefined);
    (useNotificationStore as unknown as jest.Mock).mockImplementation(mockStore);

    const { getByText } = render(<NotificationPermissionExplanationSheet />);
    
    fireEvent.press(getByText('Not Now'));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('hasSeenNotificationExplainer', 'deferred');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('appOpenCountSinceDeferral', '0');
      expect(setShowNotificationExplainerMock).toHaveBeenCalledWith(false);
      expect(registerForPushNotifications).not.toHaveBeenCalled();
    });
  });
});
