// Password reset: Firebase emails a reset link to the address entered.
// For privacy the same message is shown whether or not an account exists.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppHeader from '../components/AppHeader';
import TextField from '../components/TextField';
import AppButton from '../components/AppButton';
import { store } from '../services/store';
import { usingEmulators } from '../services/firebase';
import { colors, radius, spacing, typography } from '../constants/theme';
import { validateEmail } from '../utils/validation';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const problem = validateEmail(email);
    setError(problem);
    if (problem) return;
    setLoading(true);
    try {
      await store.auth.resetPassword(email);
      setSent(true);
    } catch (err) {
      // "No account" is not revealed; any other problem (e.g. offline) is shown.
      if (err.code === 'auth/user-not-found') setSent(true);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard header={<AppHeader title="" />}>
      <View>
        <Text style={styles.title} accessibilityRole="header">
          Reset your password
        </Text>
        <Text style={styles.subtitle}>Enter your account email and we will send you a link to choose a new password.</Text>
      </View>

      {sent ? (
        <View style={styles.success} accessibilityLiveRegion="polite">
          <Ionicons name="mail-open-outline" size={22} color={colors.success} />
          <Text style={styles.successText}>
            If an account exists for {email.trim()}, a reset link is on its way. Check your inbox and spam folder.
            {usingEmulators ? ' (Emulator mode: the link is printed in the emulator terminal instead of being emailed.)' : ''}
          </Text>
        </View>
      ) : (
        <>
          <TextField
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError(null);
            }}
            error={error}
            icon="mail-outline"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <AppButton title="Send reset link" icon="send-outline" onPress={send} loading={loading} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1 },
  subtitle: { ...typography.small, fontSize: 15, marginTop: spacing.xs },
  success: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.successSoft, borderRadius: radius.md, padding: spacing.md },
  successText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
});
