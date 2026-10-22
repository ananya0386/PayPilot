// Screen C: Register. Creates a Firebase Authentication account (Firebase
// stores the password securely; PayPilot never sees or saves it) and a
// profile document in Firestore. Duplicate emails are rejected.
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppHeader from '../components/AppHeader';
import TextField from '../components/TextField';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { colors, radius, spacing, typography } from '../constants/theme';
import { compact, validateEmail, validateName, validatePassword } from '../utils/validation';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const toast = useToast();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (text) => {
    setValues((v) => ({ ...v, [key]: text }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleRegister = async () => {
    const found = compact({
      name: validateName(values.name, 'Full name'),
      email: validateEmail(values.email),
      password: validatePassword(values.password),
      confirm: values.confirm !== values.password ? 'Passwords do not match.' : null,
    });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      await register(values.name.trim(), values.email.trim(), values.password);
      toast.show('Account created. Welcome to PayPilot!');
    } catch (error) {
      if (error.details) setErrors(error.details); // e.g. duplicate email
      setFormError(error);
      setLoading(false);
    }
  };

  return (
    <Screen keyboard header={<AppHeader title="" />}>
      <View>
        <Text style={styles.title} accessibilityRole="header">
          Create your account
        </Text>
        <Text style={styles.subtitle}>It takes less than a minute. Your data is stored securely in Firebase.</Text>
      </View>

      <TextField
        label="Full name"
        placeholder="e.g. Priya Patel"
        value={values.name}
        onChangeText={set('name')}
        error={errors.name}
        icon="person-outline"
        autoComplete="name"
        maxLength={60}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />
      <TextField
        ref={emailRef}
        label="Email"
        placeholder="you@example.com"
        value={values.email}
        onChangeText={set('email')}
        error={errors.email}
        icon="mail-outline"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label="Password"
        placeholder="At least 8 characters"
        value={values.password}
        onChangeText={set('password')}
        error={errors.password}
        helper="Use at least 8 characters with a letter and a number."
        icon="lock-closed-outline"
        secure
        autoCapitalize="none"
        autoComplete="new-password"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <TextField
        ref={confirmRef}
        label="Confirm password"
        placeholder="Type it again"
        value={values.confirm}
        onChangeText={set('confirm')}
        error={errors.confirm}
        icon="shield-checkmark-outline"
        secure
        autoCapitalize="none"
        returnKeyType="go"
        onSubmitEditing={handleRegister}
      />

      {formError ? (
        <View style={styles.alert} accessibilityLiveRegion="assertive">
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={styles.alertText}>{formError.message}</Text>
        </View>
      ) : null}

      <AppButton title="Create Account" onPress={handleRegister} loading={loading} />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Already have an account?</Text>
        <Pressable onPress={() => router.replace('/login')} hitSlop={10} accessibilityRole="link">
          <Text style={styles.link}>Log in</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1 },
  subtitle: { ...typography.small, fontSize: 15, marginTop: spacing.xs },
  alert: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  alertText: { flex: 1, color: colors.error, fontSize: 14, lineHeight: 19 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  switchText: { ...typography.small, fontSize: 14 },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
