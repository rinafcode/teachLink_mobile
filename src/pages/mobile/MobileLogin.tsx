import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Mail,
  Lock,
  LogIn,
  Eye,
  EyeOff,
  Chrome,
  Apple,
  BookOpen,
  AlertCircle,
} from 'lucide-react-native';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { BiometricInlineButton, BiometricPrompt } from '../../components/mobile/BiometricPrompt';
import mobileAuthService, { AuthResult } from '../../services/mobileAuth';
import * as secureStorage from '../../services/secureStorage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MobileLoginProps {
  onLoginSuccess: (result: AuthResult) => void;
  onForgotPassword?: () => void;
  onRegister?: () => void;
  isDark?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MobileLogin: React.FC<MobileLoginProps> = ({
  onLoginSuccess,
  onForgotPassword,
  onRegister,
  isDark = false,
}) => {
  // ── State ────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    biometricType,
    authenticate: authenticateBiometric,
    isLoading: biometricLoading,
    error: biometricError,
    clearError: clearBiometricError,
  } = useBiometricAuth();

  // ── Load remembered email on mount ───────────────────────────────────────
  useEffect(() => {
    async function loadRemembered() {
      const [savedEmail, savedRememberMe] = await Promise.all([
        mobileAuthService.getRememberedEmail(),
        secureStorage.isRememberMeEnabled(),
      ]);
      if (savedEmail) setEmail(savedEmail);
      if (savedRememberMe) setRememberMe(true);
    }
    loadRemembered();
  }, []);

  // ── Auto-trigger biometric on mount if enabled ───────────────────────────
  useEffect(() => {
    if (biometricEnabled && biometricAvailable) {
      // Small delay so screen renders first
      const timer = setTimeout(() => {
        setShowBiometricModal(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [biometricEnabled, biometricAvailable]);

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#fff';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#19c3e6';

  // ── Password login ───────────────────────────────────────────────────────
  const handlePasswordLogin = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const result = await mobileAuthService.login({
        email: email.trim().toLowerCase(),
        password,
        rememberMe,
      });
      onLoginSuccess(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Biometric flow ───────────────────────────────────────────────────────
  const handleBiometricLogin = async () => {
    clearBiometricError();
    const result = await authenticateBiometric();
    if (result) {
      setShowBiometricModal(false);
      onLoginSuccess(result);
    }
  };

  const handleBiometricDismiss = () => {
    setShowBiometricModal(false);
    clearBiometricError();
  };

  // ── Social login stubs ───────────────────────────────────────────────────
  const handleSocialLogin = (provider: 'google' | 'apple') => {
    Alert.alert(
      `${provider === 'google' ? 'Google' : 'Apple'} Sign In`,
      'Social login integration requires native SDK configuration.',
    );
  };

  // ── Input border colors ──────────────────────────────────────────────────
  const emailBorder = error?.toLowerCase().includes('email')
    ? '#ef4444'
    : emailFocused
    ? accentColor
    : borderColor;

  const passwordBorder = error?.toLowerCase().includes('password')
    ? '#ef4444'
    : passwordFocused
    ? accentColor
    : borderColor;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#20afe7', '#586ce9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <BookOpen size={30} color="#fff" />
            </LinearGradient>
            <Text style={[styles.appName, { color: textPrimary }]}>TeachLink</Text>
            <Text style={[styles.tagline, { color: textSecondary }]}>
              Sign in to continue learning
            </Text>
          </View>

          {/* ── Card ── */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            {/* Error banner */}
            {error && (
              <View style={styles.errorBanner}>
                <AlertCircle size={14} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: textSecondary }]}>Email</Text>
              <View
                style={[
                  styles.inputRow,
                  { borderColor: emailBorder, backgroundColor: isDark ? '#0f172a' : '#f8fafc' },
                ]}
              >
                <Mail size={18} color={emailFocused ? accentColor : textSecondary} />
                <TextInput
                  style={[styles.input, { color: textPrimary }]}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(null); }}
                  placeholder="you@example.com"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: textSecondary }]}>Password</Text>
                {onForgotPassword && (
                  <TouchableOpacity onPress={onForgotPassword}>
                    <Text style={[styles.forgotLink, { color: accentColor }]}>
                      Forgot password?
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View
                style={[
                  styles.inputRow,
                  { borderColor: passwordBorder, backgroundColor: isDark ? '#0f172a' : '#f8fafc' },
                ]}
              >
                <Lock size={18} color={passwordFocused ? accentColor : textSecondary} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { color: textPrimary }]}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(null); }}
                  placeholder="Enter your password"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  returnKeyType="go"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onSubmitEditing={handlePasswordLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={textSecondary} />
                  ) : (
                    <Eye size={18} color={textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me */}
            <View style={styles.rememberRow}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: borderColor, true: accentColor }}
                thumbColor="#fff"
                ios_backgroundColor={borderColor}
              />
              <Text style={[styles.rememberLabel, { color: textSecondary }]}>
                Remember me
              </Text>
            </View>

            {/* Primary CTA */}
            <TouchableOpacity
              style={[
                styles.loginBtn,
                { opacity: isLoading ? 0.7 : 1 },
              ]}
              onPress={handlePasswordLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#20afe7', '#586ce9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtnGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <LogIn size={18} color="#fff" />
                    <Text style={styles.loginBtnText}>Sign In</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Biometric + Social row */}
            {(biometricAvailable || true) && (
              <>
                <View style={styles.dividerRow}>
                  <View style={[styles.divider, { backgroundColor: borderColor }]} />
                  <Text style={[styles.dividerText, { color: textSecondary }]}>or</Text>
                  <View style={[styles.divider, { backgroundColor: borderColor }]} />
                </View>

                <View style={styles.altRow}>
                  {biometricEnabled && biometricAvailable && (
                    <BiometricInlineButton
                      biometricType={biometricType}
                      isLoading={biometricLoading}
                      onPress={() => setShowBiometricModal(true)}
                      isDark={isDark}
                    />
                  )}

                  <TouchableOpacity
                    style={[styles.socialBtn, { borderColor }]}
                    onPress={() => handleSocialLogin('google')}
                    activeOpacity={0.7}
                  >
                    <Chrome size={22} color="#4285F4" />
                    <Text style={[styles.socialBtnText, { color: textSecondary }]}>Google</Text>
                  </TouchableOpacity>

                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={[styles.socialBtn, { borderColor }]}
                      onPress={() => handleSocialLogin('apple')}
                      activeOpacity={0.7}
                    >
                      <Apple size={22} color={isDark ? '#f1f5f9' : '#1e293b'} />
                      <Text style={[styles.socialBtnText, { color: textSecondary }]}>Apple</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>

          {/* ── Register link ── */}
          {onRegister && (
            <View style={styles.registerRow}>
              <Text style={[styles.registerText, { color: textSecondary }]}>
                Don't have an account?
              </Text>
              <TouchableOpacity onPress={onRegister}>
                <Text style={[styles.registerLink, { color: accentColor }]}>
                  {' '}Sign up
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Biometric modal */}
      <BiometricPrompt
        visible={showBiometricModal}
        biometricType={biometricType}
        isLoading={biometricLoading}
        error={biometricError}
        onAuthenticate={handleBiometricLogin}
        onFallback={handleBiometricDismiss}
        onDismiss={handleBiometricDismiss}
        isDark={isDark}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  // Header
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    gap: 10,
  },
  logoGradient: {
    width: 68,
    height: 68,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#20afe7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
  },
  // Card
  card: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  // Fields
  fieldWrap: {
    marginBottom: 12,
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  // Remember Me
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  rememberLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Login button
  loginBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
  },
  loginBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Alt auth row
  altRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  socialBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Register
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
