import React, { useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { MobileProfile } from '../components/mobile/MobileProfile';
import { useAppStore } from '../store';
import { ProfileSkeleton } from '../components/ui/Skeleton';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ route }: Props) {
  const { userId } = route.params;
  const theme = useAppStore((s) => s.theme);
  const { isLoading, setLoading } = useAppStore();

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timeout);
  }, [userId, setLoading]);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return <MobileProfile userId={userId} isDark={theme === 'dark'} />;
}
