import { useEffect } from 'react';
import { Alert, View } from 'react-native';

import { HomeScreenSkeleton } from '@/components/mobile/HomeScreenSkeleton';
import { useAnalytics } from '@/hooks';
import { useIsLoading, useAppActions } from '@/store/selectors';
import { createLazyRoute } from '@/utils/lazyRoute';
import { ScreenName } from '@/utils/trackingEvents';

const LazyHomeScreenContent = createLazyRoute({
  importFn: () =>
    import('@/screens/HomeScreenContent').then((m) => ({ default: m.HomeScreenContent })),
  LoadingFallback: HomeScreenSkeleton,
  boundaryName: 'HomeRoute',
});

const HomeScreen = () => {
  const isLoading = useIsLoading();
  const { setLoading } = useAppActions();
  const { trackScreen } = useAnalytics();

  useEffect(() => {
    trackScreen(ScreenName.HOME);
  }, [trackScreen]);

  const fetchHomeData = () => {
    setLoading(true);

    const timeoutId = setTimeout(() => {
      Alert.alert(
        'Request Timeout',
        'The server took too long to respond. Please check your connection.',
        [
          { text: 'Retry', onPress: fetchHomeData },
          { text: 'Cancel', onPress: () => setLoading(false), style: 'cancel' },
        ]
      );
    }, 10000);

    const successId = setTimeout(() => {
      clearTimeout(timeoutId);
      setLoading(false);
    }, 1500);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(successId);
    };
  };

  useEffect(() => {
    const cleanup = fetchHomeData();
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- simulated home fetch runs once on mount
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <HomeScreenSkeleton />
      </View>
    );
  }

  return <LazyHomeScreenContent />;
};

export default HomeScreen;
