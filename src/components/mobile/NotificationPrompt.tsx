import React from 'react';
import { Modal, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
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
    <View className="mb-4 flex-row items-start">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
        <Text className="text-xl">{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">{title}</Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">{description}</Text>
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
            <View className="rounded-t-3xl bg-white px-6 pb-10 pt-6 dark:bg-gray-900">
              <Text className="mb-4 text-center text-lg text-gray-600 dark:text-gray-400">
                Push notifications are only available on physical devices.
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="items-center rounded-xl bg-indigo-600 py-4"
              >
                <Text className="text-base font-semibold text-white">Got it</Text>
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
          <SafeAreaView className="rounded-t-3xl bg-white dark:bg-gray-900">
            <View className="px-6 pb-4 pt-6">
              {/* Header */}
              <View className="mb-6 items-center">
                <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                  <Text className="text-3xl">🔔</Text>
                </View>
                <Text className="text-center text-2xl font-bold text-gray-900 dark:text-white">
                  Stay Updated
                </Text>
                <Text className="mt-2 text-center text-base text-gray-600 dark:text-gray-400">
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
                  className={`items-center rounded-xl py-4 ${
                    isLoading ? 'bg-indigo-400' : 'bg-indigo-600'
                  }`}
                >
                  <Text className="text-base font-semibold text-white">
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
                  className="items-center rounded-xl bg-gray-100 py-4 dark:bg-gray-800"
                >
                  <Text className="text-base font-semibold text-gray-700 dark:text-gray-300">
                    Maybe Later
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Privacy Note */}
              <Text className="mt-4 text-center text-xs text-gray-500 dark:text-gray-500">
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
