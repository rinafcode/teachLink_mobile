import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';

interface QRScannerProps {
  onLinkScanned: (value: string) => void;
}

export default function QRScanner({ onLinkScanned }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanningPaused, setIsScanningPaused] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        if (mounted) {
          setHasPermission(status === 'granted');
        }
      } catch {
        if (mounted) {
          setHasPermission(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleBarCodeScanned = ({ data }: BarCodeScannerResult) => {
    if (isScanningPaused) {
      return;
    }

    setIsScanningPaused(true);

    if (!data) {
      Alert.alert('Scan failed', 'No QR code data was detected. Please try again.');
      setIsScanningPaused(false);
      return;
    }

    onLinkScanned(data);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.statusText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.statusText}>Camera access is required to scan QR codes.</Text>
        <Text style={styles.instructionsText}>
          Please grant camera permission in your device settings and try again.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.scannerContainer}>
        <BarCodeScanner onBarCodeScanned={handleBarCodeScanned} style={styles.scanner} />
      </View>
      <View style={styles.bottomPanel}>
        <Text style={styles.title}>Scan a TeachLink QR code</Text>
        <Text style={styles.description}>
          Position the code inside the frame. The app will open the matching screen automatically.
        </Text>
        {isScanningPaused && (
          <TouchableOpacity style={styles.button} onPress={() => setIsScanningPaused(false)}>
            <Text style={styles.buttonText}>Scan again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  instructionsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  scanner: {
    flex: 1,
  },
  bottomPanel: {
    padding: 20,
    backgroundColor: '#111827',
  },
  title: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 12,
    backgroundColor: '#19c3e6',
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
});
