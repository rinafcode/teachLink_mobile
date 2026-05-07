import React, { lazy, Suspense } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';

import { useAppStore } from '@/src/store';
import mobileAuthService from '@/src/services/mobileAuth';

const MobileSettings = lazy(() => import('@/src/components/mobile/MobileSettings'));

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
      <Suspense
        fallback={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        }
      >
        <MobileSettings onSignOut={handleSignOut} />
      </Suspense>
    </SafeAreaView>
  );
}