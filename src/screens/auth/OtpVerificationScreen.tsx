import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppText } from '../../components/common/AppText';
import PrimaryButton from '../../components/common/PrimaryButton';
import { useDynamicFontSize } from '../../hooks';
import authService from '../../services/mobileAuth';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const LAST_OTP_SENT_KEY = 'otp_last_sent_at';

interface OtpVerificationScreenProps {
  email: string;
  onVerified: () => void;
  onBack?: () => void;
  isDark?: boolean;
}

export const OtpVerificationScreen: React.FC<OtpVerificationScreenProps> = ({
  email,
  onVerified,
  onBack,
  isDark = false,
}) => {
  const { scale } = useDynamicFontSize();
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted cooldown on mount
  useEffect(() => {
    const loadCooldown = async () => {
      try {
        const lastSentStr = await AsyncStorage.getItem(LAST_OTP_SENT_KEY);
        if (lastSentStr) {
          const lastSentAt = parseInt(lastSentStr, 10);
          const elapsed = Math.floor((Date.now() - lastSentAt) / 1000);
          const remaining = Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed);
          setCooldownSeconds(remaining);
        }
      } catch {
        // Ignore storage errors
      }
    };
    void loadCooldown();
  }, []);

  // Tick cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      return;
    }

    cooldownTimerRef.current = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [cooldownSeconds > 0]);

  const handleOtpChange = useCallback(
    (text: string, index: number) => {
      if (text.length > 1) {
        // Handle paste
        const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (index + i < OTP_LENGTH) {
            newOtp[index + i] = digit;
          }
        });
        setOtp(newOtp);
        const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
        setError(null);
        return;
      }

      const newOtp = [...otp];
      newOtp[index] = text;
      setOtp(newOtp);
      setError(null);

      if (text && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      }
    },
    [otp]
  );

  const handleVerify = useCallback(async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete verification code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await authService.verifyOtp(email, code);
      onVerified();
    } catch (err: any) {
      const message = err?.message || 'Verification failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [otp, email, onVerified]);

  const handleResend = useCallback(async () => {
    if (cooldownSeconds > 0) return;

    try {
      await authService.sendOtp(email);
      const now = Date.now();
      await AsyncStorage.setItem(LAST_OTP_SENT_KEY, now.toString());
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send code. Please try again.');
    }
  }, [cooldownSeconds, email]);

  const formatCooldown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isResendDisabled = cooldownSeconds > 0;

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={scale(24)} color={isDark ? '#fff' : '#111827'} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, isDark && styles.textLight]}>Verify Email</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <ShieldCheck size={48} color="#19c3e6" />
        </View>

        <Text style={[styles.title, isDark && styles.textLight]}>Enter Verification Code</Text>

        <Text style={[styles.subtitle, isDark && styles.textMutedDark]}>
          We sent a {OTP_LENGTH}-digit code to{'\n'}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                isDark && styles.otpInputDark,
                digit ? styles.otpInputFilled : null,
                error ? styles.otpInputError : null,
              ]}
              value={digit}
              onChangeText={text => handleOtpChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              selectTextOnFocus
            />
          ))}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.buttonContainer}>
          <PrimaryButton
            onPress={handleVerify}
            title={isLoading ? 'Verifying...' : 'Verify'}
            variant="gradient"
            size="medium"
          />
        </View>

        <View style={styles.resendContainer}>
          <Text style={[styles.resendLabel, isDark && styles.textMutedDark]}>
            {isResendDisabled ? (
              <>Resend code in <Text style={styles.cooldownText}>{formatCooldown(cooldownSeconds)}</Text></>
            ) : (
              "Didn't receive a code?"
            )}
          </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={isResendDisabled}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.resendButton,
                isResendDisabled && styles.resendButtonDisabled,
              ]}
            >
              Resend Code
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(25, 195, 230, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emailHighlight: {
    fontWeight: '600',
    color: '#19c3e6',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#fff',
  },
  otpInputDark: {
    borderColor: '#374151',
    backgroundColor: '#1f2937',
    color: '#fff',
  },
  otpInputFilled: {
    borderColor: '#19c3e6',
    backgroundColor: 'rgba(25, 195, 230, 0.05)',
  },
  otpInputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resendLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  cooldownText: {
    fontWeight: '600',
    color: '#19c3e6',
  },
  resendButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#19c3e6',
  },
  resendButtonDisabled: {
    color: '#9ca3af',
  },
  textLight: {
    color: '#f9fafb',
  },
  textMutedDark: {
    color: '#9ca3af',
  },
});

export default OtpVerificationScreen;
