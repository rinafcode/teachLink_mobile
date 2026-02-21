import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { MobileProfile } from '../components/mobile/MobileProfile';
import { useAppStore } from '../store';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ route }: Props) {
  const { userId } = route.params;
  const theme = useAppStore((s) => s.theme);

  return <MobileProfile userId={userId} isDark={theme === 'dark'} />;
}
