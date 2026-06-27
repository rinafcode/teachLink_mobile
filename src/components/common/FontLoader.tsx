import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

import { useCustomFonts, FONT_CONFIGS } from '../../hooks/useCustomFonts';

interface FontLoaderProps {
  children: React.ReactNode;
  onFontsLoaded?: () => void;
  onFontsFailed?: (error: Error) => void;
  showLoadingIndicator?: boolean;
  loadingText?: string;
}

export const FontLoader = ({
  children,
  onFontsLoaded,
  onFontsFailed,
  showLoadingIndicator = true,
  loadingText = 'Loading fonts...',
}: FontLoaderProps) => {
  const { loaded, error, progress } = useCustomFonts(Object.values(FONT_CONFIGS), {
    autoLoad: true,
    onComplete: (status) => {
      if (status.loaded) {
        onFontsLoaded?.();
      } else if (status.error) {
        onFontsFailed?.(status.error);
      }
    },
  });

  if (!loaded && showLoadingIndicator) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#19c3e6" />
        <Text style={styles.loadingText}>
          {loadingText} {Math.round(progress)}%
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load fonts</Text>
        <Text style={styles.errorSubtext}>Using system fonts instead</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'System',
  },
  errorText: {
    fontSize: 18,
    color: '#ff4444',
    fontFamily: 'System',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
});
