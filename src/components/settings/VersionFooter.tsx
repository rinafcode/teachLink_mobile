import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import * as Clipboard from 'expo-clipboard';

export const VersionFooter = () => {
  const [copied, setCopied] = useState(false);

  const version = Application.nativeApplicationVersion ?? 'unknown';
  const buildNumber = Application.nativeBuildVersion ?? 'unknown';
  const updateId = Updates.updateId ?? 'N/A';
  const versionString = `v${version} (${buildNumber}) | OTA: ${updateId.slice(0, 8)}`;

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(versionString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [versionString]);

  return (
    <Pressable onPress={handleCopy} style={styles.container}>
      <Text style={styles.text}>{copied ? 'Copied!' : versionString}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
