import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { ProfileSkeleton } from '@/components/mobile/ProfileSkeleton';
import { useAppStore } from '@/store';
import { createLazyRoute } from '@/utils/lazyRoute';

const LazyMobileProfile = createLazyRoute({
  importFn: () =>
    import('@/components/mobile/MobileProfile').then(m => ({ default: m.MobileProfile })),
  LoadingFallback: ProfileSkeleton,
  boundaryName: 'ProfileRoute',
});

const ProfileScreen = () => {
  const { userId } = useLocalSearchParams();
  const theme = useAppStore(s => s.theme);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LazyMobileProfile userId={userId as string} isDark={theme === 'dark'} isLoading={isLoading} />
  );
};

export default ProfileScreen;
