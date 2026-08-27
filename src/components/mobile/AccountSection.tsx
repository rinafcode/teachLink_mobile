import React, { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

import { NativeToggle } from './NativeToggle';
import { SettingRow } from './SettingRow';
import { SettingsPicker } from './SettingsPicker';
import { ICON_EYE, ICON_LOCK, ICON_FINGERPRINT, ICON_USER, ICON_CREDIT_CARD_YELLOW, ICON_CREDIT_CARD_GREEN } from './settingsIcons';
import { VISIBILITY_OPTIONS } from './settingsOptions';
import { SettingsSection } from './SettingsSection';
import { useRequireReauth } from '../../hooks';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { ProfileVisibility, useSettingsStore } from '../../store/settingsStore';

interface AccountSectionProps {
  onChangePassword: () => void;
}

/**
 * Memoised Account section — profile visibility, 2FA, biometric login,
 * password and payment. Owns all hooks it needs so toggling another
 * section never repaints this one.
 */
export const AccountSection = memo(function AccountSection({
  onChangePassword,
}: AccountSectionProps) {
  const {
    profileVisibility,
    setProfileVisibility,
    twoFactorEnabled,
    setTwoFactorEnabled,
  } = useSettingsStore();

  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    enable: enableBiometric,
    disable: disableBiometric,
    isLoading: biometricLoading,
  } = useBiometricAuth();

  const { performReauthCheck } = useRequireReauth();

  const handleBiometricToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        const ok = await enableBiometric();
        if (!ok) {
          Alert.alert('Biometric Login', 'Enable failed. Check device settings.');
        }
      } else {
        await disableBiometric();
      }
    },
    [enableBiometric, disableBiometric]
  );

  const handleChangePaymentMethod = useCallback(async () => {
    const authorized = await performReauthCheck();
    if (authorized) {
      Alert.alert('Payment Method', 'Payment method updated successfully.');
    } else {
      Alert.alert('Re-authentication Failed', 'Verification required to change payment method.');
    }
  }, [performReauthCheck]);

  const handleViewFullCardNumber = useCallback(async () => {
    const authorized = await performReauthCheck();
    if (authorized) {
      Alert.alert('Card Details', 'Card Number: **** **** **** 4242');
    } else {
      Alert.alert('Re-authentication Failed', 'Verification required to view card details.');
    }
  }, [performReauthCheck]);

  // Memoised right elements (stable references)
  const profileVisibilityRight = useMemo(
    () => (
      <SettingsPicker
        label="Visibility"
        value={profileVisibility}
        options={VISIBILITY_OPTIONS}
        onValueChange={setProfileVisibility}
      />
    ),
    [profileVisibility, setProfileVisibility]
  );

  const twoFactorRight = useMemo(
    () => <NativeToggle value={twoFactorEnabled} onValueChange={setTwoFactorEnabled} />,
    [twoFactorEnabled, setTwoFactorEnabled]
  );

  const biometricIcon = useMemo(
    () => (biometricLoading ? <ActivityIndicator /> : ICON_FINGERPRINT),
    [biometricLoading]
  );

  const biometricRight = useMemo(
    () => (
      <NativeToggle
        value={biometricEnabled}
        onValueChange={handleBiometricToggle}
        disabled={biometricLoading}
      />
    ),
    [biometricEnabled, handleBiometricToggle, biometricLoading]
  );

  return (
    <SettingsSection title="Account">
      <SettingRow
        icon={ICON_EYE}
        label="Profile Visibility"
        right={profileVisibilityRight}
        accessibilityLabel={`Profile Visibility: ${profileVisibility}`}
      />

      <SettingRow
        icon={ICON_LOCK}
        label="Two-Factor Auth"
        right={twoFactorRight}
        accessibilityLabel={`Two-Factor Auth: ${twoFactorEnabled ? 'enabled' : 'disabled'}`}
      />

      {biometricAvailable && (
        <SettingRow
          icon={biometricIcon}
          label="Biometric Login"
          description={biometricEnabled ? 'Enabled' : 'Disabled'}
          right={biometricRight}
          accessibilityLabel={`Biometric Login: ${biometricEnabled ? 'enabled' : 'disabled'}`}
        />
      )}

      <SettingRow
        icon={ICON_USER}
        label="Change Password"
        onPress={onChangePassword}
        accessibilityLabel="Change Password"
      />
      <SettingRow
        icon={ICON_CREDIT_CARD_YELLOW}
        label="Change Payment Method"
        onPress={handleChangePaymentMethod}
        accessibilityLabel="Change Payment Method"
      />
      <SettingRow
        icon={ICON_CREDIT_CARD_GREEN}
        label="View Full Card Number"
        onPress={handleViewFullCardNumber}
        accessibilityLabel="View Full Card Number"
      />
    </SettingsSection>
  );
});
