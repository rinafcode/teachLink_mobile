import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface UpdatePromptModalProps {
  visible: boolean;
  onUpdate: () => void;
  onDismiss?: () => void;
  isCritical?: boolean;
  version?: string;
}

const UpdatePromptModal = ({
  visible,
  onUpdate,
  onDismiss,
  isCritical = false,
  version,
}: UpdatePromptModalProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={isCritical ? undefined : onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {isCritical ? 'Update Required' : 'Update Available'}
          </Text>

          {version && (
            <Text style={styles.version}>Version {version}</Text>
          )}

          <Text style={styles.description}>
            {isCritical
              ? 'A critical update is available and must be installed to continue using the app.'
              : 'A newer version of the app is available. Update now for the latest features and improvements.'}
          </Text>

          <View style={styles.buttonRow}>
            {!isCritical && onDismiss ? (
              <Pressable
                onPress={onDismiss}
                style={[styles.button, styles.secondaryButton]}
                disabled={isUpdating}
              >
                <Text style={styles.secondaryButtonText}>Later</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleUpdate}
              style={[styles.button, styles.primaryButton, (!isCritical || true) && { flex: 1 }]}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isCritical ? 'Update Now' : 'Update'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  version: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    color: '#4b5563',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#19c3e6',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});

export default UpdatePromptModal;
