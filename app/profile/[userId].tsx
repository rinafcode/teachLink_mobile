import { useAppStore } from '@/src/store';
import { useLocalSearchParams } from 'expo-router';
import React, { Suspense, useEffect, useState } from 'react';

const MobileProfile = React.lazy(() =>
  import('@/src/components/mobile/MobileProfile').then(m => ({ default: m.MobileProfile }))
);

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams();
  const theme = useAppStore(s => s.theme);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Suspense fallback={null}>
      <MobileProfile userId={userId as string} isDark={theme === 'dark'} isLoading={isLoading} />
    </Suspense>
  );
}
