import React, { useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, BookOpen, Lock, Mail, User } from 'lucide-react-native';
import { useDynamicFontSize } from '../../hooks/useDynamicFontSize';
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

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const MobileRegister: React.FC<MobileRegisterProps> = ({
  onRegisterSuccess,
  onLogin,
  isDark = false,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
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

  const passwordStrength = getPasswordStrength(password);

  function clearFieldError(field: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const nameCheck = validateName(name);
    const emailCheck = validateEmail(email);
    const passwordCheck = validatePassword(password);
    const confirmCheck = validateConfirmPassword(password, confirmPassword);

    const next: FieldErrors = {};
    if (!nameCheck.valid) next.name = nameCheck.message;
    if (!emailCheck.valid) next.email = emailCheck.message;
    if (!passwordCheck.valid) next.password = passwordCheck.message;
    if (!confirmCheck.valid) next.confirmPassword = confirmCheck.message;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const handleRegister = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      // Registration API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onRegisterSuccess?.();
    } finally {
      setIsLoading(false);
    }
  };

  const fieldBorder = (field: keyof FieldErrors) =>
    errors[field] ? '#ef4444' : borderColor;

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
            {/* Name */}
            <View style={styles.fieldWrap}>
              <Text allowFontScaling={false} style={[styles.label, { color: textSecondary }]}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputRow, { borderColor: fieldBorder('name'), backgroundColor: inputBg }]}>
                <User size={scale(18)} color={textSecondary} />
                <TextInput
                  allowFontScaling={false}
                  style={[styles.input, { color: textPrimary }]}
                  value={name}
                  onChangeText={(v) => { setName(v); clearFieldError('name'); }}
                  placeholder="Your full name"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  autoCapitalize="words"
                  autoComplete="name"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
              {errors.name && <FieldError message={errors.name} scale={scale} />}
            </View>

            {/* Email */}
            <View style={styles.fieldWrap}>
              <Text allowFontScaling={false} style={[styles.label, { color: textSecondary }]}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputRow, { borderColor: fieldBorder('email'), backgroundColor: inputBg }]}>
                <Mail size={scale(18)} color={textSecondary} />
                <TextInput
                  allowFontScaling={false}
                  ref={emailRef}
                  style={[styles.input, { color: textPrimary }]}
                  value={email}
                  onChangeText={(v) => { setEmail(v); clearFieldError('email'); }}
                  placeholder="you@example.com"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
              {errors.email && <FieldError message={errors.email} scale={scale} />}
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text allowFontScaling={false} style={[styles.label, { color: textSecondary }]}>
                Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputRow, { borderColor: fieldBorder('password'), backgroundColor: inputBg }]}>
                <Lock size={scale(18)} color={textSecondary} />
                <TextInput
                  allowFontScaling={false}
                  ref={passwordRef}
                  style={[styles.input, { color: textPrimary }]}
                  value={password}
                  onChangeText={(v) => { setPassword(v); clearFieldError('password'); }}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  secureTextEntry
                  autoComplete="new-password"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
              </View>
              {errors.password && <FieldError message={errors.password} scale={scale} />}
              {password.length > 0 && !errors.password && (
                <PasswordStrengthBar strength={passwordStrength} scale={scale} />
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldWrap}>
              <Text allowFontScaling={false} style={[styles.label, { color: textSecondary }]}>
                Confirm Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputRow, { borderColor: fieldBorder('confirmPassword'), backgroundColor: inputBg }]}>
                <Lock size={scale(18)} color={textSecondary} />
                <TextInput
                  allowFontScaling={false}
                  ref={confirmRef}
                  style={[styles.input, { color: textPrimary }]}
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); clearFieldError('confirmPassword'); }}
                  placeholder="Repeat your password"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  secureTextEntry
                  autoComplete="new-password"
                  returnKeyType="go"
                  onSubmitEditing={handleRegister}
                />
              </View>
              {errors.confirmPassword && (
                <FieldError message={errors.confirmPassword} scale={scale} />
              )}
            </View>

            <TouchableOpacity
              style={[styles.registerBtn, { opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleRegister}
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
                  {' '}Sign in
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function FieldError({ message, scale }: { message: string; scale: (n: number) => number }) {
  return (
    <View style={fieldErrorStyles.row}>
      <AlertCircle size={scale(13)} color="#ef4444" />
      <Text allowFontScaling={false} style={[fieldErrorStyles.text, { fontSize: scale(12) }]}>
        {message}
      </Text>
    </View>
  );
}

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

function PasswordStrengthBar({
  strength,
  scale,
}: {
  strength: ReturnType<typeof getPasswordStrength>;
  scale: (n: number) => number;
}) {
  return (
    <View style={strengthStyles.wrap}>
      <View style={strengthStyles.bars}>
        {([0, 1, 2, 3] as const).map((i) => (
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
}

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
