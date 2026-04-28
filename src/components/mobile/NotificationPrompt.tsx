import React from 'react';
import {
    Modal,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNotificationPermission } from '../../hooks';
import { useNotificationStore } from '../../store/notificationStore';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface NotificationPromptProps {
  /** Whether the prompt modal is visible */
  visible: boolean;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Callback when notification permission is granted */
  onPermissionGranted?: () => void;
  /** Callback when notification permission is denied */
  onPermissionDenied?: () => void;
}

interface NotificationTypeItemProps {
  /** Emoji icon to display */
  icon: string;
  /** Title of the notification type */
  title: string;
  /** Description of the notification type */
  description: string;
}

function NotificationTypeItem({ icon, title, description }: NotificationTypeItemProps) {
  return (
    <View className="flex-row items-start mb-4">
      <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mr-3">
        <Text className="text-xl">{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </Text>
      </View>
    </View>
  );
}

export function NotificationPrompt({
  visible,
  onClose,
  onPermissionGranted,
  onPermissionDenied,
}: NotificationPromptProps) {
  const { requestPermission, isLoading, isDevice, openSettings, permissionStatus } =
    useNotificationPermission();
  const { setHasPromptedForPermission, setPermissionDeniedAt } = useNotificationStore();

  const handleEnable = async () => {
    setHasPromptedForPermission(true);

    if (permissionStatus === 'denied') {
      // If previously denied, open settings
      await openSettings();
      onClose();
      return;
    }

    const granted = await requestPermission();

    if (granted) {
      onPermissionGranted?.();
      onClose();
    } else {
      setPermissionDeniedAt(new Date().toISOString());
      onPermissionDenied?.();
    }
  };

  const handleMaybeLater = () => {
    setHasPromptedForPermission(true);
    onClose();
  };

  if (!isDevice) {
    return (
      <ErrorBoundary boundaryName="NotificationPrompt.DeviceModal">
        <Modal visible={visible} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white dark:bg-gray-900 rounded-t-3xl px-6 pt-6 pb-10">
              <Text className="text-lg text-center text-gray-600 dark:text-gray-400 mb-4">
                Push notifications are only available on physical devices.
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="bg-indigo-600 rounded-xl py-4 items-center"
              >
                <Text className="text-white font-semibold text-base">Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary boundaryName="NotificationPrompt.Modal">
      <Modal visible={visible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <SafeAreaView className="bg-white dark:bg-gray-900 rounded-t-3xl">
            <View className="px-6 pt-6 pb-4">
            {/* Header */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center mb-4">
                <Text className="text-3xl">🔔</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center">
                Stay Updated
              </Text>
              <Text className="text-base text-gray-600 dark:text-gray-400 text-center mt-2">
                Enable notifications to never miss important updates
              </Text>
            </View>

            {/* Notification Types */}
            <View className="mb-6">
              <NotificationTypeItem
                icon="📚"
                title="Course Updates"
                description="New lessons, content updates, and course announcements"
              />
              <NotificationTypeItem
                icon="💬"
                title="Messages"
                description="Direct messages and chat notifications"
              />
              <NotificationTypeItem
                icon="⏰"
                title="Learning Reminders"
                description="Daily reminders to keep your learning streak"
              />
              <NotificationTypeItem
                icon="🏆"
                title="Achievements"
                description="Celebrate when you unlock new achievements"
              />
            </View>

            {/* Buttons */}
            <View className="space-y-3">
              <TouchableOpacity
                onPress={handleEnable}
                disabled={isLoading}
                className={`rounded-xl py-4 items-center ${
                  isLoading ? 'bg-indigo-400' : 'bg-indigo-600'
                }`}
              >
                <Text className="text-white font-semibold text-base">
                  {isLoading
                    ? 'Enabling...'
                    : permissionStatus === 'denied'
                    ? 'Open Settings'
                    : 'Enable Notifications'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleMaybeLater}
                disabled={isLoading}
                className="rounded-xl py-4 items-center bg-gray-100 dark:bg-gray-800"
              >
                <Text className="text-gray-700 dark:text-gray-300 font-semibold text-base">
                  Maybe Later
                </Text>
              </TouchableOpacity>
            </View>

            {/* Privacy Note */}
            <Text className="text-xs text-gray-500 dark:text-gray-500 text-center mt-4">
              You can change your notification preferences anytime in Settings
            </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </ErrorBoundary>
  );
}

export default NotificationPrompt;
