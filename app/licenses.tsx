import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsSkeleton } from '@/components/mobile/SettingsSkeleton';
import { createLazyRoute } from '@/utils/lazyRoute';

const LazyLicenses = createLazyRoute({
  importFn: () => import('@/components/mobile/LicensesScreen'),
  LoadingFallback: SettingsSkeleton,
  boundaryName: 'LicensesRoute',
});

const LicensesScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <LazyLicenses />
    </SafeAreaView>
  );
};

export default LicensesScreen;
