import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { MobileHeader } from '../components/mobile/MobileHeader';
import { MobileSearch } from '../components/mobile/MobileSearch';
import { SearchResultItem } from '../components/mobile/SearchResultCard';
import { sampleCourse } from '../data/sampleCourse';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

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
          <ActivityIndicator size="large" color="#19c3e6" />
          <Text style={styles.skeletonText}>Loading results...</Text>
          <View style={styles.skeletonBox} />
          <View style={styles.skeletonBox} />
          <View style={styles.skeletonBox} />
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
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  skeletonText: {
    marginTop: 12,
    marginBottom: 24,
    fontSize: 16,
    color: '#6B7280',
  },
  skeletonBox: {
    width: '100%',
    height: 70,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 12,
  },
});
