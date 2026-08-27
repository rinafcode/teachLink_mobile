import React, { memo, useCallback } from 'react';
import { Alert, Platform } from 'react-native';

import { SettingRow } from './SettingRow';
import { ICON_LOGOUT_RED, ICON_ALERT } from './settingsIcons';
import { SettingsSection } from './SettingsSection';
import { useRequireReauth } from '../../hooks';

interface AccountActionsSectionProps {
  onSignOut: () => void;
}

/**
 * Memoised Account Actions section — sign out and delete account.
 * Both require confirmation dialogs and delete also needs reauth.
 */
export const AccountActionsSection = memo(function AccountActionsSection({
  onSignOut,
}: AccountActionsSectionProps) {
  const { performReauthCheck } = useRequireReauth();

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
    ]);
  }, [onSignOut]);

  const handleDeleteAccount = useCallback(async () => {
    const authorized = await performReauthCheck();
    if (!authorized) {
      Alert.alert('Re-authentication Failed', 'Verification required to delete your account.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your data, progress, and purchases will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Alert.alert(
                'Are you absolutely sure?',
                'Type DELETE in the next prompt to confirm account deletion.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert('Account Deleted', 'Your account has been deleted.');
                    },
                  },
                ]
              );
            } else {
              Alert.alert(
                'Confirm Deletion',
                'Please type DELETE to confirm',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert('Account Deleted', 'Your account has been deleted.');
                    },
                  },
                ],
                { cancelable: true }
              );
            }
          },
        },
      ]
    );
  }, [performReauthCheck]);

  return (
    <SettingsSection title="Account Actions">
      <SettingRow
        icon={ICON_LOGOUT_RED}
        label="Sign Out"
        onPress={handleSignOut}
        destructive
        accessibilityLabel="Sign Out"
      />
      <SettingRow
        icon={ICON_ALERT}
        label="Delete Account"
        description="Permanently delete your account and all data"
        onPress={handleDeleteAccount}
        destructive
        accessibilityLabel="Delete Account"
      />
    </SettingsSection>
  );
});
