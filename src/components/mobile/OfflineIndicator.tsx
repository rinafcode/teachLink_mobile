import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNetworkStatus } from '../../hooks';
import logger from '../../utils/logger';

// Props interface
interface OfflineIndicatorProps {
  showWhenOnline?: boolean;
  position?: 'top' | 'bottom';
  backgroundColor?: string;
  textColor?: string;
  onPress?: () => void;
  showDetails?: boolean;
}

/**
 * Component to show offline status indicator
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showWhenOnline = false,
  position = 'top',
  backgroundColor = '#FF5722',
  textColor = '#FFFFFF',
  onPress = () => {},
  showDetails = false,
}) => {
  const { isOnline, isOffline, networkStatus, refresh } = useNetworkStatus();

  // Don't show when online unless explicitly requested
  if (isOnline && !showWhenOnline) {
    return null;
  }

  const getPositionStyles = () => {
    const baseStyles: any = {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 1000,
      paddingVertical: 8,
      paddingHorizontal: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor,
    };

    switch (position) {
      case 'top':
        return { ...baseStyles, top: 0 };
      case 'bottom':
        return { ...baseStyles, bottom: 0 };
      default:
        return { ...baseStyles, top: 0 };
    }
  };

  const handleRefresh = async () => {
    try {
      await refresh();
      if (onPress) {
        onPress();
      }
    } catch (error) {
      logger.error('Error refreshing network status:', error);
    }
  };

  // Simple text-based indicator for now due to JSX configuration issues
  return React.createElement(
    TouchableOpacity,
    {
      onPress: handleRefresh,
      activeOpacity: 0.8,
      style: getPositionStyles(),
    },
    React.createElement(
      View,
      { style: { flex: 1 } },
      React.createElement(
        Text,
        { style: { color: textColor, fontWeight: 'bold' } },
        isOffline ? 'OFFLINE MODE' : 'ONLINE'
      ),
      isOffline &&
        React.createElement(
          Text,
          { style: { color: textColor, fontSize: 12, marginTop: 4 } },
          'Tap to refresh connection'
        )
    )
  );
};

// Export simplified versions
export const OfflineBanner = OfflineIndicator;
export const OnlineIndicator = (props: any) =>
  React.createElement(OfflineIndicator, {
    ...props,
    showWhenOnline: true,
    backgroundColor: '#4CAF50',
  });
export const ConnectionQualityIndicator = (props: any) =>
  React.createElement(OfflineIndicator, { ...props, position: 'bottom' });
export const OfflineFAB = (props: any) => null; // Disabled due to configuration issues

export default OfflineIndicator;
