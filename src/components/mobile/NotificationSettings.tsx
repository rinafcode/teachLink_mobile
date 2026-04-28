import React from 'react';
import { View, Text, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { useNotificationPermission } from '../../hooks';
import { useNotificationStore } from '../../store/notificationStore';
import { NotificationPreferences } from '../../types/notifications';

interface SettingRowProps {
  icon: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function SettingRow({
  icon,
  title,
  description,
  value,
  onValueChange,
  disabled = false,
}: SettingRowProps) {
  return (
    <View
      className={`flex-row items-center py-4 px-4 ${disabled ? 'opacity-50' : ''}`}
    >
      <View className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 items-center justify-center mr-3">
        <Text className="text-xl">{icon}</Text>
      </View>
      <View className="flex-1 mr-3">
        <Text className="text-base font-medium text-gray-900 dark:text-white">
          {title}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
        thumbColor={value ? '#4F46E5' : '#9CA3AF'}
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );
}

export function NotificationSettings() {
  const { permissionStatus, requestPermission, openSettings, isLoading } =
    useNotificationPermission();
  const { preferences, setPreference, pushToken } = useNotificationStore();
  const [savingKey, setSavingKey] = useState<keyof NotificationPreferences | null>(null);

  const isEnabled = permissionStatus === 'granted' && pushToken !== null;

  const handlePreferenceChange = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    try {
      setSavingKey(key);
      // Update local preferences (automatically persisted by Zustand)
      setPreference(key, value);
      
      // TODO: Sync with backend
      // try {
      //   await api.updateNotificationPreferences({ [key]: value });
      // } catch (error) {
      //   console.error('Failed to sync notification preferences:', error);
      //   // Preferences are still saved locally even if sync fails
      // }
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Permission Status Banner */}
      {permissionStatus !== 'granted' && (
        <View className="mx-4 mt-4 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800">
          <View className="flex-row items-center mb-2">
            <Text className="text-lg mr-2">&#x26A0;</Text>
            <Text className="text-base font-semibold text-amber-800 dark:text-amber-200">
              Notifications Disabled
            </Text>
          </View>
          <Text className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            {permissionStatus === 'denied'
              ? 'You have denied notification permissions. Enable them in your device settings to receive updates.'
              : 'Enable notifications to stay updated with courses, messages, and achievements.'}
          </Text>
          <TouchableOpacity
            onPress={permissionStatus === 'denied' ? openSettings : requestPermission}
            disabled={isLoading}
            className="bg-amber-600 py-2 px-4 rounded-lg self-start"
          >
            <Text className="text-white font-medium">
              {isLoading
                ? 'Enabling...'
                : permissionStatus === 'denied'
                ? 'Open Settings'
                : 'Enable Notifications'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notification Categories */}
      <View className="mt-6">
        <Text className="px-4 pb-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
          Notification Types
        </Text>
        <View className="bg-white dark:bg-gray-800 rounded-xl mx-4">
          <SettingRow
            icon="&#x1F4DA;"
            title="Course Updates"
            description="New lessons, content updates, and announcements"
            value={preferences.courseUpdates}
            onValueChange={(value) => handlePreferenceChange('courseUpdates', value)}
            disabled={!isEnabled}
          />
          <View className="h-px bg-gray-200 dark:bg-gray-700 mx-4" />

          <SettingRow
            icon="&#x1F4AC;"
            title="Messages"
            description="Direct messages and chat notifications"
            value={preferences.messages}
            onValueChange={(value) => handlePreferenceChange('messages', value)}
            disabled={!isEnabled}
          />
          <View className="h-px bg-gray-200 dark:bg-gray-700 mx-4" />

          <SettingRow
            icon="&#x23F0;"
            title="Learning Reminders"
            description="Daily reminders to keep your streak"
            value={preferences.learningReminders}
            onValueChange={(value) => handlePreferenceChange('learningReminders', value)}
            disabled={!isEnabled}
          />
          <View className="h-px bg-gray-200 dark:bg-gray-700 mx-4" />

          <SettingRow
            icon="&#x1F3C6;"
            title="Achievement Unlocks"
            description="Celebrate when you unlock achievements"
            value={preferences.achievementUnlocks}
            onValueChange={(value) => handlePreferenceChange('achievementUnlocks', value)}
            disabled={!isEnabled}
          />
          <View className="h-px bg-gray-200 dark:bg-gray-700 mx-4" />

          <SettingRow
            icon="&#x1F465;"
            title="Community Activity"
            description="Posts, comments, and community updates"
            value={preferences.communityActivity}
            onValueChange={(value) => handlePreferenceChange('communityActivity', value)}
            disabled={!isEnabled}
          />
        </View>
      </View>

      {/* Debug Info (remove in production) */}
      {__DEV__ && (
        <View className="mt-6 mx-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            Debug Info
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Permission: {permissionStatus}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Token: {pushToken ? `${pushToken.slice(0, 30)}...` : 'Not registered'}
          </Text>
        </View>
      )}

      <View className="h-8" />
    </ScrollView>
  );
}

export default NotificationSettings;
