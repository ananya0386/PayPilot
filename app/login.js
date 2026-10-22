// Screen B: Login with Firebase Authentication (email + password).
// Wrong credentials are rejected with the same message for unknown emails,
// so the screen never reveals which emails have accounts.
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppHeader from '../components/AppHeader';
import TextField from '../components/TextField';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, typography } from '../constants/theme';
import { compact, validateEmail } from '../utils/validation';

export default function LoginScreen() {
  const router = useRouter();
  const { login, profileError } = useAuth();
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(profileError);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const found = compact({ email: validateEmail(email), password: password ? null : 'Password is required.' });
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      // No navigation needed: the root layout switches to the app automatically.
    } catch (error) {
      setFormError(error);
      setLoading(false);
    }
  };


  return (
    <Screen keyboard header={<AppHeader title="" />}>
      <View>
        <Text style={styles.title} accessibilityRole="header">
          Welcome back
        </Text>
        <Text style={styles.subtitle}>Log in to see your subscriptions and upcoming payments.</Text>
      </View>

      <TextField
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setErrors((e) => ({ ...e, email: undefined }));
        }}
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
        placeholder="Your password"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setErrors((e) => ({ ...e, password: undefined }));
        }}
        error={errors.password}
        icon="lock-closed-outline"
        secure
        autoCapitalize="none"
        autoComplete="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />

      {formError ? (
        <View style={styles.alert} accessibilityLiveRegion="assertive">
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={styles.alertText}>{formError.message}</Text>
        </View>
      ) : null}

      <Pressable onPress={() => router.push('/forgot-password')} hitSlop={10} accessibilityRole="link" style={styles.forgot}>
        <Text style={styles.link}>Forgot password?</Text>
      </Pressable>

      <AppButton title="Log In" onPress={handleLogin} loading={loading} />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>New to PayPilot?</Text>
        <Pressable onPress={() => router.replace('/register')} hitSlop={10} accessibilityRole="link">
          <Text style={styles.link}>Create an account</Text>
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
  forgot: { alignSelf: 'flex-end' },
});
