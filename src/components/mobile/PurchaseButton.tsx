import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Zap, Lock } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'outline';

interface PurchaseButtonProps {
  /** Label shown on the button */
  label: string;
  /** Formatted price string (e.g. "$9.99/mo") */
  price?: string;
  /** Badge text rendered above the button (e.g. "7-day free trial") */
  trialBadge?: string;
  /** Savings label (e.g. "Save 33%") */
  savingsBadge?: string;
  /** Whether a purchase is currently processing */
  isLoading?: boolean;
  /** Whether the purchase just completed successfully */
  isSuccess?: boolean;
  /** Disable the button entirely */
  disabled?: boolean;
  /** Visual style variant */
  variant?: ButtonVariant;
  onPress: () => void;
  /** Dark-mode flag */
  isDark?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PurchaseButton: React.FC<PurchaseButtonProps> = ({
  label,
  price,
  trialBadge,
  savingsBadge,
  isLoading = false,
  isSuccess = false,
  disabled = false,
  variant = 'primary',
  onPress,
  isDark = false,
}) => {
  const isDisabled = disabled || isLoading || isSuccess;

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.contentRow}>
          <ActivityIndicator
            size="small"
            color={variant === 'outline' ? '#19c3e6' : '#fff'}
          />
          <Text
            style={[
              styles.label,
              { color: variant === 'outline' ? '#19c3e6' : '#fff' },
            ]}
          >
            Processing…
          </Text>
        </View>
      );
    }

    if (isSuccess) {
      return (
        <View style={styles.contentRow}>
          <Check size={18} color="#fff" />
          <Text style={[styles.label, { color: '#fff' }]}>Purchased!</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentRow}>
        {variant === 'primary' && <Zap size={16} color="#fff" />}
        {variant === 'secondary' && <Zap size={16} color="#19c3e6" />}
        <View>
          <Text
            style={[
              styles.label,
              {
                color:
                  variant === 'outline'
                    ? '#19c3e6'
                    : variant === 'secondary'
                    ? '#19c3e6'
                    : '#fff',
              },
            ]}
          >
            {label}
          </Text>
          {price && (
            <Text
              style={[
                styles.priceLabel,
                {
                  color:
                    variant === 'outline'
                      ? '#64748b'
                      : variant === 'secondary'
                      ? '#64748b'
                      : 'rgba(255,255,255,0.8)',
                },
              ]}
            >
              {price}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      {/* Trial or savings badge above the button */}
      {(trialBadge || savingsBadge) && !isLoading && !isSuccess && (
        <View style={styles.badgeRow}>
          {trialBadge && (
            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>{trialBadge}</Text>
            </View>
          )}
          {savingsBadge && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsBadgeText}>{savingsBadge}</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[styles.touchable, isDisabled && styles.disabledOpacity]}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={
              isSuccess
                ? ['#10b981', '#059669']
                : ['#20afe7', '#2c8aec', '#586ce9']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientInner}
          >
            {renderContent()}
          </LinearGradient>
        ) : variant === 'secondary' ? (
          <View
            style={[
              styles.gradientInner,
              {
                backgroundColor: isDark ? '#1e293b' : '#f0f9ff',
                borderWidth: 1.5,
                borderColor: '#19c3e6',
              },
            ]}
          >
            {renderContent()}
          </View>
        ) : (
          // outline
          <View
            style={[
              styles.gradientInner,
              {
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                borderColor: isDisabled ? '#94a3b8' : '#19c3e6',
              },
            ]}
          >
            {renderContent()}
          </View>
        )}
      </TouchableOpacity>

      {disabled && !isLoading && (
        <View style={styles.lockedRow}>
          <Lock size={12} color="#94a3b8" />
          <Text style={styles.lockedText}>Already active on this plan</Text>
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 2,
  },
  trialBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  trialBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  savingsBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  savingsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  touchable: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  disabledOpacity: {
    opacity: 0.6,
  },
  gradientInner: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 2,
  },
  lockedText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
