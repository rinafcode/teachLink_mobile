import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MobileHeader } from '../src/components/mobile/MobileHeader';
import { MobileSearch } from '../src/components/mobile/MobileSearch';
import { SearchResultItem } from '../src/components/mobile/SearchResultCard';
import { sampleCourse } from '../src/data/sampleCourse';

export default function SearchScreen() {
  const router = useRouter();

  const handleResultPress = (item: SearchResultItem) => {
    if (item.id === sampleCourse.id) {
      router.push({
        pathname: '/course-viewer',
        params: { course: JSON.stringify(sampleCourse) }
      });
    }
  };

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
});
