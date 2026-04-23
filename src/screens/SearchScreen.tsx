import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { MobileHeader } from '../components/mobile/MobileHeader';
import { MobileSearch } from '../components/mobile/MobileSearch';
import { SearchResultItem } from '../components/mobile/SearchResultCard';
import { Skeleton } from '../components/ui/Skeleton';
import { sampleCourse } from '../data/sampleCourse';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
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
      navigation.navigate('CourseViewer', { course: sampleCourse });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <MobileHeader title="Search" showBack />
        <ScrollView style={styles.skeletonContainer}>
          <Skeleton width="40%" height={20} borderRadius={4} style={{ marginBottom: 24 }} />
          <View style={styles.searchSkeleton}>
            <Skeleton height={48} borderRadius={24} />
          </View>
          <View style={styles.resultsSkeleton}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.resultItemSkeleton}>
                <Skeleton variant="rectangular" width={60} height={60} borderRadius={8} />
                <View style={styles.resultTextSkeleton}>
                  <Skeleton width="70%" height={16} borderRadius={4} />
                  <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
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
    padding: 16,
  },
  searchSkeleton: {
    marginBottom: 24,
  },
  resultsSkeleton: {
    gap: 16,
  },
  resultItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  resultTextSkeleton: {
    flex: 1,
  },
});