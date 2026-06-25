import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AccessibleModal } from './AccessibleModal';
import { UpdateCheckResult, UpdateType } from '../../services/appUpdateService';

interface UpdateNotificationModalProps {
  visible: boolean;
  checkResult: UpdateCheckResult | null;
  isDownloading: boolean;
  error: string | null;
  onApply: () => void;
  onOpenStore: () => void;
  onDismiss: () => void;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  visible,
  checkResult,
  isDownloading,
  error,
  onApply,
  onOpenStore,
  onDismiss,
}) => {
  const updateType: UpdateType = checkResult?.updateType ?? 'none';
  const isMandatory = checkResult?.isMandatory ?? false;

  const title = isMandatory ? 'Update Required' : 'Update Available';
  const releaseNotes = checkResult?.releaseNotes;
  const currentVersion = checkResult?.currentVersion ?? '';

  const description =
    updateType === 'ota'
      ? 'A new version of TeachLink is ready to install. The update will apply and restart the app.'
      : 'A new version of TeachLink is available. Tap below to open the app store and update.';

  return (
    <AccessibleModal
      visible={visible}
      onClose={isMandatory ? () => {} : onDismiss}
      accessibilityLabel="App update notification"
      containerStyle={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.version}>Current version: {currentVersion}</Text>
      </View>

      <Text style={styles.description}>{description}</Text>

      {releaseNotes ? (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>{"What's new:"}</Text>
          <Text style={styles.notesText}>{releaseNotes}</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.actions}>
        {updateType === 'ota' && (
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={onApply}
            disabled={isDownloading}
            accessibilityRole="button"
            accessibilityLabel="Install update now"
            accessibilityState={{ disabled: isDownloading }}
          >
            {isDownloading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Install Now</Text>
            )}
          </Pressable>
        )}

        {updateType === 'store' && (
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={onOpenStore}
            accessibilityRole="button"
            accessibilityLabel="Open app store to update"
          >
            <Text style={styles.primaryButtonText}>
              {Platform.OS === 'ios' ? 'Open App Store' : 'Open Play Store'}
            </Text>
          </Pressable>
        )}

        {!isMandatory && (
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss update notification"
          >
            <Text style={styles.secondaryButtonText}>Later</Text>
          </Pressable>
        )}
      </View>
    </AccessibleModal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  version: {
    fontSize: 13,
    color: '#64748B',
  },
  description: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  notesContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  notesText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#19c3e6',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '500',
  },
});
