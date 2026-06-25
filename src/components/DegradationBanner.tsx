/**
 * Feature Degradation Banner Component
 *
 * Displays user-friendly notifications when features are degraded or unavailable.
 * Shows in a collapsible banner with action buttons for recovery.
 *
 * Usage:
 * <DegradationBanner feature={FeatureType.CAMERA} />
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

import { useThemeColor } from './themed-view';
import { FeatureType, featureCapabilities } from '../services/featureCapabilities';
import { useDegradationStore } from '../store/degradationStore';
import { appLogger } from '../utils/logger';

interface DegradationBannerProps {
  feature: FeatureType;
  /** Auto-dismiss after N milliseconds (0 = no auto-dismiss) */
  autoDismissAfter?: number;
  /** Callback when user takes action */
  onActionTaken?: (action: 'retry' | 'dismissed') => void;
  /** Custom message override */
  customMessage?: string;
  /** Whether to show retry button */
  showRetryButton?: boolean;
  /** Callback for retry button */
  onRetry?: () => Promise<void>;
}

export const DegradationBanner: React.FC<DegradationBannerProps> = ({
  feature,
  autoDismissAfter = 0,
  onActionTaken,
  customMessage,
  showRetryButton = true,
  onRetry,
}) => {
  const [visible, setVisible] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const animationValue = useRef(new Animated.Value(1)).current;
  const degradationStore = useDegradationStore();
  const isDegraded = degradationStore.isFeatureDegraded(feature);
  const featureInfo = featureCapabilities.getFeatureInfo(feature);

  const accentColor = useThemeColor({}, 'warning');
  const backgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');

  const message = customMessage || featureCapabilities.getUnavailabilityMessage(feature);
  const fallbackDescription = featureInfo.fallbackDescription;

  // Auto-dismiss logic
  useEffect(() => {
    if (autoDismissAfter > 0 && visible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissAfter);
      return () => clearTimeout(timer);
    }
  }, [visible, autoDismissAfter]);

  const handleDismiss = () => {
    Animated.timing(animationValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onActionTaken?.('dismissed');
      degradationStore.addNotification({
        feature,
        status: featureInfo.status,
        message,
        actionTaken: 'dismissed',
      });
    });
  };

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    try {
      await onRetry();
      appLogger.infoSync(`[DegradationBanner] Retry successful for ${feature}`);
      onActionTaken?.('retry');
      degradationStore.addNotification({
        feature,
        status: featureInfo.status,
        message: `${feature} retry initiated`,
        actionTaken: 'retryRequested',
      });
    } catch (error) {
      appLogger.errorSync(
        `[DegradationBanner] Retry failed for ${feature}`,
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isDegraded || !visible) {
    return null;
  }

  const opacity = animationValue;

  return (
    <Animated.View
      style={{
        opacity,
        transform: [
          {
            translateY: animationValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          },
        ],
      }}
    >
      <View
        style={{
          backgroundColor,
          borderLeftWidth: 4,
          borderLeftColor: accentColor,
          padding: 12,
          marginHorizontal: 12,
          marginVertical: 8,
          borderRadius: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        }}
      >
        {/* Header with feature name and close button */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: accentColor,
              flex: 1,
            }}
          >
            {feature.charAt(0).toUpperCase() + feature.slice(1)} Unavailable
          </Text>
          <TouchableOpacity
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.6}
          >
            <Text style={{ fontSize: 20, color: textColor, opacity: 0.5 }}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Main message */}
        <Text style={{ fontSize: 13, color: textColor, marginBottom: 8, lineHeight: 18 }}>
          {message}
        </Text>

        {/* Fallback description */}
        {fallbackDescription && (
          <Text
            style={{
              fontSize: 12,
              color: textColor,
              opacity: 0.7,
              marginBottom: 12,
              lineHeight: 16,
            }}
          >
            💡 {fallbackDescription}
          </Text>
        )}

        {/* Action buttons */}
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          {showRetryButton && onRetry && (
            <TouchableOpacity
              onPress={handleRetry}
              disabled={isRetrying}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: accentColor,
                borderRadius: 6,
                opacity: isRetrying ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#fff',
                }}
              >
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: accentColor,
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: accentColor,
              }}
            >
              Dismiss
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

/**
 * Feature Degradation Notifications Panel
 * Shows all current degradation notifications
 */
interface DegradationNotificationsPanelProps {
  maxNotifications?: number;
  autoHide?: boolean;
}

export const DegradationNotificationsPanel: React.FC<DegradationNotificationsPanelProps> = ({
  maxNotifications = 3,
  autoHide = true,
}) => {
  const degradationStore = useDegradationStore();
  const unreadNotifications = degradationStore.getUnreadNotifications().slice(0, maxNotifications);
  const backgroundColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');

  if (unreadNotifications.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 4 }}>
      {unreadNotifications.map((notification) => (
        <View
          key={notification.id}
          style={{
            backgroundColor,
            padding: 12,
            borderRadius: 8,
            borderLeftWidth: 4,
            borderLeftColor: '#F59E0B',
            marginHorizontal: 12,
            marginVertical: 4,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: textColor, marginBottom: 4 }}>
                {notification.feature}
              </Text>
              <Text style={{ fontSize: 12, color: textColor, opacity: 0.8 }}>
                {notification.message}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => degradationStore.dismissNotification(notification.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 18, color: textColor, opacity: 0.5 }}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

/**
 * Feature Status Indicator
 * Shows visual indicator of feature availability
 */
interface FeatureStatusIndicatorProps {
  feature: FeatureType;
  size?: 'small' | 'medium' | 'large';
}

export const FeatureStatusIndicator: React.FC<FeatureStatusIndicatorProps> = ({
  feature,
  size = 'medium',
}) => {
  const degradationStore = useDegradationStore();
  const isDegraded = degradationStore.isFeatureDegraded(feature);

  const sizeStyles = {
    small: { width: 8, height: 8 },
    medium: { width: 12, height: 12 },
    large: { width: 16, height: 16 },
  };

  const colors = {
    available: '#10B981', // Green
    degraded: '#F59E0B', // Amber
    unavailable: '#EF4444', // Red
  };

  const statusColor = isDegraded ? colors.degraded : colors.available;

  return (
    <View
      style={{
        ...sizeStyles[size],
        borderRadius: (sizeStyles[size].width as number) / 2,
        backgroundColor: statusColor,
      }}
    />
  );
};
