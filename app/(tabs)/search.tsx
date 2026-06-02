import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  CourseCardSkeleton,
  SearchResultItem,
  SearchScreenSkeleton,
  Skeleton,
} from '@/components';
import { sampleCourse } from '@/data/sampleCourse';
import { createLazyRoute } from '@/utils/lazyRoute';

const LazyMobileSearch = createLazyRoute({
  importFn: () =>
    import('@/components/mobile/MobileSearch').then((m) => ({ default: m.MobileSearch })),
  LoadingFallback: SearchScreenSkeleton,
  boundaryName: 'SearchRoute',
});

const SearchTab = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const fetchSearchData = () => {
    setIsLoading(true);

    const timeoutId = setTimeout(() => {
      Alert.alert('Request Timeout', 'Loading search results took too long. Please try again.', [
        { text: 'Retry', onPress: fetchSearchData },
        { text: 'Cancel', onPress: () => setIsLoading(false), style: 'cancel' },
      ]);
    }, 10000);

    const successId = setTimeout(() => {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }, 1200);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(successId);
    };
  };

  useEffect(() => {
    const cleanup = fetchSearchData();
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- simulated search fetch runs once on mount
  }, []);

  const handleResultPress = (item: SearchResultItem) => {
    if (item.id === sampleCourse.id) {
      router.push({
        pathname: '/course-viewer',
        params: { course: JSON.stringify(sampleCourse) },
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonContainer}>
          <View style={styles.skeletonSearchBar}>
            <Skeleton width="100%" height={50} borderRadius={25} />
          </View>
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LazyMobileSearch onResultPress={handleResultPress} placeholder="Search courses..." />
    </View>
  );
};

export default SearchTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  skeletonContainer: {
    flex: 1,
    paddingTop: 16,
    alignItems: 'center',
  },
  skeletonSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
});
