import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { } from '../../components/mobile/SettingsSkeleton';
import { } from '../../services/mobileAuth';
import { } from '../../store';
import { } from '../../utils/lazyRoute';

const LazyMobileSettings = createLazyRoute({
  importFn: () => import('../components/mobile/MobileSettings'),
  LoadingFallback: SettingsSkeleton,
  boundaryName: 'SettingsRoute',
});

const SettingsScreen = () => {
  const router = useRouter();
  const { logout } = useAppStore();

  const handleSignOut = async () => {
    await mobileAuthService.logout();
    logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <LazyMobileSettings onSignOut={handleSignOut} />
    </SafeAreaView>
  );
};

export default SettingsScreen;
