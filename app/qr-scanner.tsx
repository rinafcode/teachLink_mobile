import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, View } from 'react-native';
import QRScanner from '@/src/components/mobile/QRScanner';
import { getPathFromDeepLink, parseDeepLinkUrl } from '@/src/utils/linkParser';

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
    <View style={{ flex: 1 }}>
      <QRScanner onLinkScanned={handleLinkScanned} />
    </View>
  );
}
