import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, ImageIcon, X, Check, RefreshCw } from 'lucide-react-native';
import { useCamera } from '../../hooks/useCamera';

interface AvatarCameraProps {
  visible: boolean;
  currentAvatar?: string | null;
  onConfirm: (imageUri: string) => void;
  onClose: () => void;
}

export const AvatarCamera: React.FC<AvatarCameraProps> = ({
  visible,
  currentAvatar,
  onConfirm,
  onClose,
}) => {
  const { isLoading, takePicture, pickFromLibrary, resetCapturedImage } =
    useCamera();
  const [preview, setPreview] = useState<string | null>(null);

  const handleTakePhoto = async () => {
    const uri = await takePicture();
    if (uri) setPreview(uri);
  };

  const handlePickFromLibrary = async () => {
    const uri = await pickFromLibrary();
    if (uri) setPreview(uri);
  };

  const handleConfirm = () => {
    if (preview) {
      onConfirm(preview);
      setPreview(null);
      resetCapturedImage();
      onClose();
    }
  };

  const handleRetake = () => {
    setPreview(null);
    resetCapturedImage();
  };

  const handleClose = () => {
    setPreview(null);
    resetCapturedImage();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Update Profile Photo</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {preview ? (
            /* Preview Mode */
            <View style={styles.previewSection}>
              <Image source={{ uri: preview }} style={styles.previewImage} />
              <Text style={styles.previewLabel}>Looking good!</Text>
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={handleRetake}
                >
                  <RefreshCw size={18} color="#64748b" />
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirm}>
                  <LinearGradient
                    colors={['#20afe7', '#2c8aec', '#586ce9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.confirmButton}
                  >
                    <Check size={18} color="#fff" />
                    <Text style={styles.confirmText}>Use Photo</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Options Mode */
            <View style={styles.optionsSection}>
              {currentAvatar ? (
                <Image
                  source={{ uri: currentAvatar }}
                  style={styles.currentAvatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>No photo yet</Text>
                </View>
              )}

              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#19c3e6" />
                </View>
              )}

              <View style={styles.optionButtons}>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handleTakePhoto}
                  disabled={isLoading}
                >
                  <View style={styles.optionIcon}>
                    <Camera size={28} color="#19c3e6" />
                  </View>
                  <Text style={styles.optionLabel}>Camera</Text>
                </TouchableOpacity>

                <View style={styles.optionDivider} />

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={handlePickFromLibrary}
                  disabled={isLoading}
                >
                  <View style={styles.optionIcon}>
                    <ImageIcon size={28} color="#2c8aec" />
                  </View>
                  <Text style={styles.optionLabel}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSection: {
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#19c3e6',
  },
  previewLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  retakeText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
  optionsSection: {
    alignItems: 'center',
    padding: 24,
  },
  currentAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#e2e8f0',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPlaceholderText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 24,
    zIndex: 1,
  },
  optionButtons: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  optionDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});
