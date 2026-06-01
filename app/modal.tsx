import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const ModalScreen = () => (
  <ErrorBoundary boundaryName="ModalRoute">
    <ThemedView style={styles.container}>
      <ThemedText type="title">This is a modal</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Go to home screen</ThemedText>
      </Link>
    </ThemedView>
  </ErrorBoundary>
);

export default ModalScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
