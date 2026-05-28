import { useAppStore } from '@/src/store';
import React, { Suspense, useEffect, useState } from 'react';

const MobileProfile = React.lazy(() =>
  import('@/src/components/mobile/MobileProfile').then(m => ({ default: m.MobileProfile }))
);

export default function ProfileTab() {
  const theme = useAppStore(s => s.theme);
  const user = useAppStore(s => s.user);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const userId = user?.id ?? '123';

  return (
    <Suspense fallback={null}>
      <MobileProfile userId={userId} isDark={theme === 'dark'} isLoading={isLoading} />
    </Suspense>
  );
}
