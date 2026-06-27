import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, MobileSettings } from '../../components';
import { useDynamicFontSize } from '../../hooks';

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
const SettingsPage = ({
  onBack,
  onSignOut,
  onChangePassword,
  onLinkedAccounts,
}: SettingsPageProps) => {
  const { scale } = useDynamicFontSize();

  return (
    <SafeAreaView className="flex-1 bg-themeBg" edges={['top']}>
      <StatusBar style="auto" />

      {/* ── Header ──────────────────────────────────────────── */}
      <View className="flex-row items-center border-b border-themeBorder bg-themeBg px-4 py-3">
        {onBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-themeCard"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={scale(20)} color="currentColor" className="text-themeText" />
          </TouchableOpacity>
        ) : (
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-themeCard">
            <SettingsIcon size={scale(20)} color="currentColor" className="text-themePrimary" />
          </View>
        )}

        <View className="flex-1">
          <AppText style={{ fontSize: 20 }} className="font-bold text-themeText">
            Settings
          </AppText>
          <AppText style={{ fontSize: 12 }} className="text-themeTextMuted">
            Manage your account &amp; preferences
          </AppText>
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
};

export default SettingsPage;
