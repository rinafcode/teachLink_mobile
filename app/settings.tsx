import { useAppStore } from '@/src/store';
import React, { lazy, Suspense } from 'react';
import { ActivityIndicator, Switch, View } from 'react-native';
import { AppText } from '@/src/components/common/AppText';

const MobileSettings = lazy(() => import('@/src/components/mobile/MobileSettings'));

export default function SettingsScreen() {
  const { theme, setTheme } = useAppStore();
  const isDark = theme === 'dark';

  return (
    <Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      }
    >
      <MobileSettings />
    </Suspense>
  );
}
