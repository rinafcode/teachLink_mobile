import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VirtualList } from '../VirtualList'; // Need to import this from ../mobile

export const ProfileCourseList = React.memo(() => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Course List Component (Placeholder)</Text>
      {/* <VirtualList data={[]} renderItem={() => <View />} /> */}
    </View>
  );
});

ProfileCourseList.displayName = 'ProfileCourseList';
