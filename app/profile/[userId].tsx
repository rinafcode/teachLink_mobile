import React from 'react';
import { MobileProfile } from '../../src/components/mobile/MobileProfile';
import { useAppStore } from '../../src/store';
import { useLocalSearchParams } from 'expo-router';

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const theme = useAppStore((s) => s.theme);

  return <MobileProfile userId={userId!} isDark={theme === 'dark'} />;
}
