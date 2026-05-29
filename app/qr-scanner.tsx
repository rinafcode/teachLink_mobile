import { useRouter } from 'expo-router';
import React, { Suspense } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { getPathFromDeepLink, parseDeepLinkUrl } from '@/src/utils/linkParser';

const QRScanner = React.lazy(() => import('@/src/components/mobile/QRScanner'));

export default function QRScannerScreen() {
  const router = useRouter();

  const handleLinkScanned = (value: string) => {
    const parsedDeepLink = parseDeepLinkUrl(value);
    if (!parsedDeepLink) {
      Alert.alert('Unsupported QR code', 'This QR code does not contain a valid TeachLink link.');
      return;
    }

    const path = getPathFromDeepLink(parsedDeepLink);
    router.replace(path);
  };

  return (
    <View style={styles.container}>
      <Suspense fallback={<ActivityIndicator style={StyleSheet.absoluteFill} size="large" />}>
        <QRScanner onLinkScanned={handleLinkScanned} />
      </Suspense>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
