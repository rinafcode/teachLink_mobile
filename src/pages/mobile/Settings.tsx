import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react-native';
import { useAppStore } from '../../store';
import { MobileSettings } from '../../components/mobile/MobileSettings';

interface SettingsPageProps {
  /** Callback for the back-navigation button in the header. */
  onBack?: () => void;
  /** Forwarded to MobileSettings — called after the user confirms sign-out. */
  onSignOut?: () => void;
  /** Forwarded to MobileSettings — opens a change-password flow. */
  onChangePassword?: () => void;
  /** Forwarded to MobileSettings — opens linked-accounts flow. */
  onLinkedAccounts?: () => void;
}

/**
 * Full-screen settings page with a native-style header and the MobileSettings
 * component as its body. Can be used inside any React Navigation stack or
 * rendered standalone.
 */
export default function SettingsPage({
  onBack,
  onSignOut,
  onChangePassword,
  onLinkedAccounts,
}: SettingsPageProps) {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* ── Header ──────────────────────────────────────────── */}
      <View className="flex-row items-center px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        {onBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            className="w-9 h-9 items-center justify-center rounded-full bg-white dark:bg-gray-800 mr-3"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color={isDark ? '#e5e7eb' : '#374151'} />
          </TouchableOpacity>
        ) : (
          <View className="w-9 h-9 items-center justify-center rounded-full bg-white dark:bg-gray-800 mr-3">
            <SettingsIcon size={20} color={isDark ? '#19c3e6' : '#19c3e6'} />
          </View>
        )}

        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            Settings
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Manage your account &amp; preferences
          </Text>
        </View>
      </View>

      {/* ── Body ────────────────────────────────────────────── */}
      <MobileSettings
        onSignOut={onSignOut}
        onChangePassword={onChangePassword}
        onLinkedAccounts={onLinkedAccounts}
      />
    </SafeAreaView>
  );
}
