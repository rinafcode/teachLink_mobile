import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNetworkStatus } from '../../hooks';
import logger from '../../utils/logger';
import { OfflineIndicator } from './OfflineIndicator';

interface Toast {
  id: string;
  message: string;
  type: 'offline' | 'online';
  timestamp: number;
}

/**
 * Provider component that integrates OfflineIndicator with toast notifications
 * Monitors network status and displays indicators when going offline/online
 */
export const OfflineIndicatorProvider = (props: any) => {
  const { children, showToastNotifications = true, toastDuration = 3000 } = props;
  const { isOnline, isOffline } = useNetworkStatus();
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [wasOffline, setWasOffline] = React.useState(isOffline);

  /**
   * Add a toast notification
   */
  const addToast = (message: string, type: 'offline' | 'online') => {
    const id = `${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, message, type, timestamp: Date.now() };

    setToasts((prev: any) => [...prev, toast]);

    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, toastDuration);

    return id;
  };

  /**
   * Remove a toast notification
   */
  const removeToast = (id: string) => {
    setToasts((prev: any) => prev.filter((t: Toast) => t.id !== id));
  };

  /**
   * Monitor network status changes
   */
  React.useEffect(() => {
    // Check if status changed from online to offline
    if (wasOffline !== isOffline) {
      if (isOffline && showToastNotifications) {
        logger.warn('📡 Network status: OFFLINE');
        addToast('You are now offline', 'offline');
      } else if (isOnline && showToastNotifications) {
        logger.info('📡 Network status: ONLINE');
        addToast('You are back online', 'online');
      }
      setWasOffline(isOffline);
    }
  }, [isOffline, isOnline, showToastNotifications, wasOffline]);

  return React.createElement(
    View,
    { style: styles.container },
    // Offline Indicator Banner
    React.createElement(OfflineIndicator, { position: 'top' }),

    // Main Content
    children,

    // Toast Notifications Container
    React.createElement(
      View,
      { style: styles.toastContainer, pointerEvents: 'box-none' },
      toasts.map((toast: Toast) =>
        React.createElement(ToastComponent, {
          key: toast.id,
          toast,
          onDismiss: () => removeToast(toast.id),
        })
      )
    )
  );
};

/**
 * Individual Toast Component
 */
const ToastComponent = (props: any) => {
  const { toast, onDismiss } = props;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const getToastStyle = () => {
    switch (toast.type) {
      case 'offline':
        return {
          backgroundColor: '#FF5722',
          icon: '⚠️',
        };
      case 'online':
        return {
          backgroundColor: '#4CAF50',
          icon: '✓',
        };
      default:
        return {
          backgroundColor: '#333',
          icon: 'ℹ️',
        };
    }
  };

  const style = getToastStyle();

  return React.createElement(
    Animated.View,
    {
      style: [styles.toast, { backgroundColor: style.backgroundColor }, { opacity: fadeAnim }],
    },
    React.createElement(
      TouchableOpacity,
      {
        style: styles.toastContent,
        onPress: onDismiss,
        activeOpacity: 0.7,
      },
      React.createElement(Text, { style: styles.toastIcon }, style.icon),
      React.createElement(Text, { style: styles.toastMessage }, toast.message),
      React.createElement(Text, { style: styles.toastDismiss }, '✕')
    )
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  toast: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 5,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toastIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  toastMessage: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  toastDismiss: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    paddingLeft: 8,
  },
});

export default OfflineIndicatorProvider;
