import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { MobileSearch } from '../components/mobile/MobileSearch';
import { MobileHeader } from '../components/mobile/MobileHeader';
import { SearchResultItem } from '../components/mobile/SearchResultCard';
import { sampleCourse } from '../data/sampleCourse';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();

  const handleResultPress = (item: SearchResultItem) => {
    if (item.id === sampleCourse.id) {
      navigation.navigate('CourseViewer', { course: sampleCourse });
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
