// Screen A: Splash / Welcome. First screen for logged-out users.
import { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../components/AppButton';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { colors, radius, spacing, typography } from '../constants/theme';

const FEATURES = [
  { icon: 'albums-outline', text: 'Track every subscription and bill in one place' },
  { icon: 'notifications-outline', text: 'Renewal reminders before money leaves' },
  { icon: 'repeat-outline', text: 'Auto-pay rules with spending limits (demo)' },
  { icon: 'pie-chart-outline', text: 'Spending insights by category and month' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const fade = useAnimatedNumber(0);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fade]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <Animated.View
        style={[styles.top, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}
      >
        <View style={styles.logo}>
          <Ionicons name="paper-plane" size={36} color={colors.accent} />
        </View>
        <Text style={styles.name} accessibilityRole="header">
          PayPilot
        </Text>
        <Text style={styles.tagline}>Your money, on autopilot.</Text>
        <Text style={styles.intro}>
          PayPilot keeps your subscriptions and recurring bills organised, reminds you before they renew and shows where your money goes
          each month.
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color={colors.accent} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={styles.actions}>
        <AppButton title="Get Started" variant="accent" icon="arrow-forward" onPress={() => router.push('/register')} />
        <AppButton title="Log In" variant="outlineLight" onPress={() => router.push('/login')} />
        <Text style={styles.footnote}>College project prototype · payments are simulated</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary, justifyContent: 'space-between' },
  top: { paddingHorizontal: spacing.xxl, paddingTop: spacing.xxxl },
  logo: {
    width: 68,
    height: 68,
    borderRadius: radius.xl,
    backgroundColor: colors.onPrimaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.display, color: colors.white, marginTop: spacing.xl },
  tagline: { fontSize: 20, fontWeight: '700', color: colors.accent, marginTop: spacing.xs },
  intro: { fontSize: 15, lineHeight: 22, color: colors.onPrimaryMuted, marginTop: spacing.md },
  features: { marginTop: spacing.xxl, gap: spacing.md + 2 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.onPrimaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, fontSize: 14.5, color: colors.white, fontWeight: '500' },
  actions: { padding: spacing.xxl, gap: spacing.sm },
  footnote: { textAlign: 'center', color: colors.onPrimaryMuted, fontSize: 12, marginTop: spacing.sm },
});
