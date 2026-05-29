import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ErrorBoundary } from '../common/ErrorBoundary';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpdatePromptProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Whether the update is currently downloading */
  isDownloading: boolean;
  /** Called when the user taps "Update Now" */
  onUpdate: () => void;
  /** Called when the user taps "Later" */
  onDismiss: () => void;
  /** Whether to use dark mode styling */
  isDark?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const UpdatePrompt: React.FC<UpdatePromptProps> = ({
  visible,
  isDownloading,
  onUpdate,
  onDismiss,
  isDark = false,
}) => {
  const bg = isDark ? '#1e293b' : '#ffffff';
  const overlay = isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const accentColor = '#19c3e6';
  const iconBg = isDark ? '#0f172a' : '#f0fbff';
  const divider = isDark ? '#334155' : '#e2e8f0';

  return (
    <ErrorBoundary boundaryName="UpdatePromptModal">
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onDismiss}
        statusBarTranslucent
      >
        <Pressable style={[styles.overlay, { backgroundColor: overlay }]} onPress={onDismiss}>
          {/* Stop tap-through on the sheet itself */}
          <Pressable
            style={[styles.sheet, { backgroundColor: bg }]}
            onPress={(e: { stopPropagation: () => void }) => e.stopPropagation()}
          >
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
              {isDownloading ? (
                <ActivityIndicator size="large" color={accentColor} />
              ) : (
                <Text style={styles.iconEmoji}>🚀</Text>
              )}
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: textPrimary }]}>
              {isDownloading ? 'Updating…' : 'Update Available'}
            </Text>

            {/* Body */}
            <Text style={[styles.body, { color: textSecondary }]}>
              {isDownloading
                ? 'Downloading the latest version. The app will restart automatically.'
                : 'A new version of TeachLink is ready. Update now for the latest features and security improvements.'}
            </Text>

            {/* What's new bullets */}
            {!isDownloading && (
              <View style={[styles.bulletContainer, { borderColor: divider }]}>
                <BulletRow icon="✨" text="New features and improvements" textColor={textSecondary} />
                <BulletRow icon="🛡️" text="Security patches applied" textColor={textSecondary} />
                <BulletRow icon="⚡" text="Performance enhancements" textColor={textSecondary} />
              </View>
            )}

            {/* CTA */}
            {!isDownloading && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                onPress={onUpdate}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Update now"
              >
                <Text style={styles.primaryBtnText}>Update Now</Text>
              </TouchableOpacity>
            )}

            {/* Dismiss */}
            {!isDownloading && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onDismiss}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Remind me later"
              >
                <Text style={[styles.secondaryBtnText, { color: textSecondary }]}>
                  Remind Me Later
                </Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ErrorBoundary>
  );
};

// ─── Bullet row helper ────────────────────────────────────────────────────────

function BulletRow({
  icon,
  text,
  textColor,
}: {
  icon: string;
  text: string;
  textColor: string;
}) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletIcon}>{icon}</Text>
      <Text style={[styles.bulletText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

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
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  bulletContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  bulletText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UpdatePrompt;
