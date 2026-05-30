import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { QRScannerSkeleton } from '@/components/mobile/QRScannerSkeleton';
import { createLazyRoute } from '@/utils/lazyRoute';
import { getPathFromDeepLink, parseDeepLinkUrl } from '@/utils/linkParser';

const LazyQRScanner = createLazyRoute({
  importFn: () => import('@/components/mobile/QRScanner'),
  LoadingFallback: QRScannerSkeleton,
  boundaryName: 'QRScannerRoute',
});

const QRScannerScreen = () => {
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
      <LazyQRScanner onLinkScanned={handleLinkScanned} />
    </View>
  );
};

export default QRScannerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
