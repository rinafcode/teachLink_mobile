import { useEffect, useState } from 'react';

import { ProfileSkeleton } from '@/components/mobile/ProfileSkeleton';
import { useAppStore } from '@/store';
import { createLazyRoute } from '@/utils/lazyRoute';

const LazyMobileProfile = createLazyRoute({
  importFn: () =>
    import('@/components/mobile/MobileProfile').then((m) => ({ default: m.MobileProfile })),
  LoadingFallback: ProfileSkeleton,
  boundaryName: 'ProfileTabRoute',
});

const ProfileTab = () => {
  const theme = useAppStore((s) => s.theme);
  const user = useAppStore((s) => s.user);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const userId = user?.id ?? '123';

  return (
    <LazyMobileProfile userId={userId} isDark={theme === 'dark'} isLoading={isLoading} />
  );
};

export default ProfileTab;
