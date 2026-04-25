import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { MobileHeader } from '@/src/components/mobile/MobileHeader';
import { MobileSearch } from '@/src/components/mobile/MobileSearch';
import { SearchResultItem } from '@/src/components/mobile/SearchResultCard';
import { sampleCourse } from '@/src/data/sampleCourse';
import { useAppStore } from '@/src/store';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { CourseCardSkeleton } from '@/src/components/mobile/CourseCardSkeleton';

export default function SearchScreen() {
  const router = useRouter();
  const { isLoading, setLoading } = useAppStore();

  const fetchSearchData = () => {
    setLoading(true);

    const timeoutId = setTimeout(() => {
        Alert.alert(
            'Request Timeout',
            'Loading search results took too long. Please try again.',
            [
                { text: 'Retry', onPress: fetchSearchData },
                { text: 'Cancel', onPress: () => setLoading(false), style: 'cancel' }
            ]
        );
    }, 10000);

    const successId = setTimeout(() => {
        clearTimeout(timeoutId);
        setLoading(false);
    }, 1200);

    return () => {
        clearTimeout(timeoutId);
        clearTimeout(successId);
    };
  };

  useEffect(() => {
    const cleanup = fetchSearchData();
    return cleanup;
  }, []);

  const handleResultPress = (item: SearchResultItem) => {
    if (item.id === sampleCourse.id) {
      router.push({
        pathname: '/course-viewer',
        params: { course: JSON.stringify(sampleCourse) }
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <MobileHeader title="Search" showBack />
        <View style={styles.skeletonContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16, marginBottom: 24, gap: 12 }}>
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
      <MobileHeader title="Search" showBack />
      <MobileSearch onResultPress={handleResultPress} placeholder="Search courses..." />
    </View>
  );
}

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
});
