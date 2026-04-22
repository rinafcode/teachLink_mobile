import React from 'react';
import ProfileScreen from '../../src/screens/ProfileScreen';
import { useLocalSearchParams } from 'expo-router';

export default function ProfileRoute() {
  const params = useLocalSearchParams();
  const userId = (params.userId as string) || '1'; // Default to '1' as in SwipeableNavigation
  
  // Create a compatible route object
  const route = {
    params: { userId }
  };

  return <ProfileScreen route={route as any} navigation={undefined as any} />;
}
