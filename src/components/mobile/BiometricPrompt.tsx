import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { FingerprintPattern, ScanFace, Eye, KeyRound } from 'lucide-react-native';
import { BiometricType } from '../../services/mobileAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BiometricPromptProps {
  /** Visible as a modal overlay */
  visible: boolean;
  biometricType: BiometricType;
  isLoading?: boolean;
  error?: string | null;
  onAuthenticate: () => void;
  onFallback: () => void;
  onDismiss: () => void;
  isDark?: boolean;
}

// ─── Biometric icon helper ────────────────────────────────────────────────────

function BiometricIcon({
  type,
  size = 52,
  color,
}: {
  type: BiometricType;
  size?: number;
  color: string;
}) {
  switch (type) {
    case 'face':
      return <ScanFace size={size} color={color} />;
    case 'iris':
      return <Eye size={size} color={color} />;
    default:
      return <FingerprintPattern size={size} color={color} />;
  }
}

function biometricLabel(type: BiometricType): string {
  switch (type) {
    case 'face':
      return 'Face ID';
    case 'iris':
      return 'Iris Scan';
    case 'fingerprint':
    default:
      return 'Fingerprint';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const BiometricPrompt: React.FC<BiometricPromptProps> = ({
  visible,
  biometricType,
  isLoading = false,
  error,
  onAuthenticate,
  onFallback,
  onDismiss,
  isDark = false,
}) => {
  const bg = isDark ? '#1e293b' : '#fff';
  const overlay = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const accentColor = '#19c3e6';
  const iconBg = isDark ? '#0f172a' : '#f0fbff';

  const label = biometricLabel(biometricType);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable style={[styles.overlay, { backgroundColor: overlay }]} onPress={onDismiss}>
        <Pressable
          style={[styles.sheet, { backgroundColor: bg }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <View style={[styles.iconBg, { backgroundColor: iconBg }]}>
            {isLoading ? (
              <ActivityIndicator size="large" color={accentColor} />
            ) : (
              <BiometricIcon type={biometricType} color={accentColor} />
            )}
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: textPrimary }]}>
            {isLoading ? 'Authenticating…' : `Sign in with ${label}`}
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            {isLoading
              ? 'Please follow the on-screen prompt'
              : `Use your ${label} to quickly and securely sign in to TeachLink`}
          </Text>

          {/* Error */}
          {error && !isLoading && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* CTA */}
          {!isLoading && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accentColor }]}
              onPress={onAuthenticate}
              activeOpacity={0.85}
            >
              <BiometricIcon type={biometricType} size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {error ? `Retry ${label}` : `Use ${label}`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Fallback */}
          {!isLoading && (
            <TouchableOpacity style={styles.fallbackBtn} onPress={onFallback}>
              <KeyRound size={15} color={textSecondary} />
              <Text style={[styles.fallbackText, { color: textSecondary }]}>
                Use password instead
              </Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Inline variant (non-modal) ───────────────────────────────────────────────

interface BiometricInlineButtonProps {
  biometricType: BiometricType;
  isLoading?: boolean;
  onPress: () => void;
  isDark?: boolean;
}

export const BiometricInlineButton: React.FC<BiometricInlineButtonProps> = ({
  biometricType,
  isLoading = false,
  onPress,
  isDark = false,
}) => {
  const accentColor = '#19c3e6';
  const border = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <TouchableOpacity
      style={[styles.inlineBtn, { borderColor: border }]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={accentColor} />
      ) : (
        <BiometricIcon type={biometricType} size={22} color={accentColor} />
      )}
      <Text style={[styles.inlineBtnText, { color: textColor }]}>
        {biometricLabel(biometricType)}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  iconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 4,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 2,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Inline variant
  inlineBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  inlineBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
