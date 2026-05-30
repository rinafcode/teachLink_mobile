import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, BookOpen, Lock, Mail, User } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { MobileFormInput } from '../../components/mobile/MobileFormInput';
import { useDynamicFontSize } from '../../hooks/useDynamicFontSize';
import { cacheFormValues } from '../../services/formCache';
import {
  getPasswordStrength,
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
} from '../../utils/validation';

interface MobileRegisterProps {
  onRegisterSuccess?: () => void;
  onLogin?: () => void;
  isDark?: boolean;
}

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const MobileRegister: React.FC<MobileRegisterProps> = ({
  onRegisterSuccess,
  onLogin,
  isDark = false,
}) => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const [isLoading, setIsLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const { scale } = useDynamicFontSize();
  const styles = createStyles(scale);
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#fff';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#19c3e6';
  const inputBg = isDark ? '#0f172a' : '#f8fafc';

  const passwordValue = watch('password');
  const passwordStrength = getPasswordStrength(passwordValue);

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await cacheFormValues({ fullName: data.name.trim(), email: data.email.trim().toLowerCase() });
      onRegisterSuccess?.();
    } finally {
      setIsLoading(false);
    }
  };

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
          <View style={styles.header}>
            <LinearGradient
              colors={['#20afe7', '#586ce9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <BookOpen size={scale(30)} color="#fff" />
            </LinearGradient>
            <Text allowFontScaling={false} style={[styles.appName, { color: textPrimary }]}>
              TeachLink
            </Text>
            <Text allowFontScaling={false} style={[styles.tagline, { color: textSecondary }]}>
              Create your account
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Controller
              control={control}
              name="name"
              rules={{
                validate: v => {
                  const r = validateName(v);
                  return r.valid || (r.message ?? 'Name is required.');
                },
              }}
              render={({ field: { onChange, value } }) => (
                <MobileFormInput
                  label="Full Name"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Your full name"
                  required
                  error={errors.name?.message}
                  isDark={isDark}
                  cacheKey="fullName"
                  keyboardType="default"
                  autoCapitalize="words"
                  leftIcon={<User size={18} color={textSecondary} />}
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              rules={{
                validate: v => {
                  const r = validateEmail(v);
                  return r.valid || (r.message ?? 'Invalid email.');
                },
              }}
              render={({ field: { onChange, value } }) => (
                <MobileFormInput
                  inputRef={emailRef}
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  placeholder="you@example.com"
                  required
                  error={errors.email?.message}
                  isDark={isDark}
                  cacheKey="email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Mail size={18} color={textSecondary} />}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              )}
            />

            {/* Password */}
            <Controller
              control={control}
              name="password"
              rules={{
                validate: v => {
                  const r = validatePassword(v);
                  return r.valid || (r.message ?? 'Invalid password.');
                },
              }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.fieldWrap}>
                  <Text allowFontScaling={false} style={[styles.label, { color: textSecondary }]}>
                    Password <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputRow,
                      {
                        borderColor: errors.password ? '#ef4444' : borderColor,
                        backgroundColor: inputBg,
                      },
                    ]}
                  >
                    <Lock size={scale(18)} color={textSecondary} />
                    <TextInput
                      allowFontScaling={false}
                      ref={passwordRef}
                      style={[styles.input, { color: textPrimary }]}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      secureTextEntry
                      autoComplete="new-password"
                      returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                    />
                  </View>
                  {errors.password && (
                    <FieldError message={errors.password.message!} scale={scale} />
                  )}
                  {value.length > 0 && !errors.password && (
                    <PasswordStrengthBar strength={passwordStrength} scale={scale} />
                  )}
                </View>
              )}
            />

            {/* Confirm Password */}
            <Controller
              control={control}
              name="confirmPassword"
              rules={{
                validate: v => {
                  const r = validateConfirmPassword(passwordValue, v);
                  return r.valid || (r.message ?? 'Passwords do not match.');
                },
              }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.fieldWrap}>
                  <Text allowFontScaling={false} style={[styles.label, { color: textSecondary }]}>
                    Confirm Password <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputRow,
                      {
                        borderColor: errors.confirmPassword ? '#ef4444' : borderColor,
                        backgroundColor: inputBg,
                      },
                    ]}
                  >
                    <Lock size={scale(18)} color={textSecondary} />
                    <TextInput
                      allowFontScaling={false}
                      ref={confirmRef}
                      style={[styles.input, { color: textPrimary }]}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Repeat your password"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      secureTextEntry
                      autoComplete="new-password"
                      returnKeyType="go"
                      onSubmitEditing={handleSubmit(onSubmit)}
                    />
                  </View>
                  {errors.confirmPassword && (
                    <FieldError message={errors.confirmPassword.message!} scale={scale} />
                  )}
                </View>
              )}
            />

            <TouchableOpacity
              style={[styles.registerBtn, { opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#20afe7', '#586ce9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerBtnGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text allowFontScaling={false} style={styles.registerBtnText}>
                    Create Account
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {onLogin && (
            <View style={styles.loginRow}>
              <Text allowFontScaling={false} style={[styles.loginText, { color: textSecondary }]}>
                Already have an account?
              </Text>
              <TouchableOpacity onPress={onLogin}>
                <Text allowFontScaling={false} style={[styles.loginLink, { color: accentColor }]}>
                  {' '}
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const FieldError = ({ message, scale }: { message: string; scale: (n: number) => number }) => {
  return (
    <View style={fieldErrorStyles.row}>
      <AlertCircle size={scale(13)} color="#ef4444" />
      <Text allowFontScaling={false} style={[fieldErrorStyles.text, { fontSize: scale(12) }]}>
        {message}
      </Text>
    </View>
  );
};

const fieldErrorStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  text: {
    color: '#ef4444',
    flex: 1,
    fontWeight: '500',
  },
});

const PasswordStrengthBar = ({
  strength,
  scale,
}: {
  strength: ReturnType<typeof getPasswordStrength>;
  scale: (n: number) => number;
}) => {
  return (
    <View style={strengthStyles.wrap}>
      <View style={strengthStyles.bars}>
        {([0, 1, 2, 3] as const).map(i => (
          <View
            key={i}
            style={[
              strengthStyles.bar,
              { backgroundColor: i <= strength.score ? strength.color : '#e2e8f0' },
            ]}
          />
        ))}
      </View>
      <Text
        allowFontScaling={false}
        style={[strengthStyles.label, { color: strength.color, fontSize: scale(12) }]}
      >
        {strength.label}
      </Text>
    </View>
  );
};

const strengthStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
});

const createStyles = (scale: (n: number) => number) =>
  StyleSheet.create({
    safe: { flex: 1 },
    kav: { flex: 1 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: scale(20),
      paddingBottom: scale(40),
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      paddingTop: scale(32),
      paddingBottom: scale(28),
      gap: scale(10),
    },
    logoGradient: {
      width: scale(68),
      height: scale(68),
      borderRadius: scale(20),
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#20afe7',
      shadowOffset: { width: 0, height: scale(8) },
      shadowOpacity: 0.35,
      shadowRadius: scale(16),
      elevation: 10,
    },
    appName: {
      fontSize: scale(28),
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: scale(14),
    },
    card: {
      borderRadius: scale(20),
      padding: scale(22),
      borderWidth: 1,
      gap: scale(4),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: scale(4) },
      shadowOpacity: 0.07,
      shadowRadius: scale(16),
      elevation: 4,
    },
    fieldWrap: {
      marginBottom: scale(12),
    },
    label: {
      fontSize: scale(13),
      fontWeight: '600',
      marginBottom: scale(6),
    },
    required: {
      color: '#ef4444',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: scale(10),
      borderWidth: 1.5,
      borderRadius: scale(12),
      paddingHorizontal: scale(14),
      paddingVertical: Platform.OS === 'ios' ? scale(13) : scale(10),
    },
    input: {
      flex: 1,
      fontSize: scale(15),
      paddingVertical: 0,
    },
    registerBtn: {
      borderRadius: scale(14),
      overflow: 'hidden',
      marginTop: scale(6),
    },
    registerBtnGradient: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: scale(15),
    },
    registerBtnText: {
      color: '#fff',
      fontSize: scale(16),
      fontWeight: '700',
    },
    loginRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: scale(20),
    },
    loginText: {
      fontSize: scale(14),
    },
    loginLink: {
      fontSize: scale(14),
      fontWeight: '700',
    },
  });
