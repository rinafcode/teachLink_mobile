import { useAppStore } from '@/src/store';
import { useLocalSearchParams } from 'expo-router';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

const MobileProfile = lazy(() =>
  import('@/src/components/mobile/MobileProfile').then((m) => ({ default: m.MobileProfile }))
);

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams();
  const theme = useAppStore((s) => s.theme);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Suspense fallback={<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>}>
      <MobileProfile userId={userId as string} isDark={theme === 'dark'} isLoading={isLoading} />
    </Suspense>
  );
}
