/**
 * Dashboard tab — Issue #390
 *
 * Exposes the TeamDashboard behind the existing lazy-route + ErrorBoundary
 * pattern used by all other tabs in this project.
 */
import { useEffect } from 'react';

import { DashboardSkeleton } from '@/components/mobile/TeamDashboard';
import { useAnalytics } from '@/hooks';
import { useAppStore } from '@/store';
import { createLazyRoute } from '@/utils/lazyRoute';
import { ScreenName } from '@/utils/trackingEvents';

const LazyTeamDashboard = createLazyRoute({
  importFn: () =>
    import('@/components/mobile/TeamDashboard/TeamDashboard').then((m) => ({
      default: m.TeamDashboard,
    })),
  LoadingFallback: DashboardSkeleton,
  boundaryName: 'DashboardRoute',
});

const DashboardTab = () => {
  const { trackScreen } = useAnalytics();
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    trackScreen(ScreenName.HOME, { tab: 'dashboard' });
  }, [trackScreen]);

  return <LazyTeamDashboard isDark={theme === 'dark'} />;
};

export default DashboardTab;
