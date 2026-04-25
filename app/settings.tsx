import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileSettings } from '@/src/components/mobile/MobileSettings';
import { useAppStore } from '@/src/store';
import mobileAuthService from '@/src/services/mobileAuth';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAppStore();

  const handleSignOut = async () => {
    await mobileAuthService.logout();
    logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <MobileSettings onSignOut={handleSignOut} />
    </SafeAreaView>
  );
}
