import { MobileProfile } from '@/src/components/mobile/MobileProfile';
import { useAppStore } from '@/src/store';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams();
  const theme = useAppStore((s) => s.theme);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return <MobileProfile userId={userId as string} isDark={theme === 'dark'} isLoading={isLoading} />;
}
