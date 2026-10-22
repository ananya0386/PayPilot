// Screen L: Profile and settings.
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { showAlert } from '../../utils/alert';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import AppButton from '../../components/AppButton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { store } from '../../services/store';
import { DEMO_ACCOUNTS } from '../../constants/categories';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { formatDate, initials } from '../../utils/format';

function MenuRow({ icon, label, onPress, last }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.menuRow, !last && styles.divider, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function PreferenceRow({ title, description, value, onChange, last }) {
  return (
    <View style={[styles.prefRow, !last && styles.divider]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.prefTitle}>{title}</Text>
        <Text style={styles.prefDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor={colors.white}
        accessibilityLabel={title}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, setUser, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const prefs = user?.notificationPreferences || { renewalReminders: true, paymentAlerts: true };

  const updatePref = async (key, value) => {
    const previous = user;
    setUser({ ...user, notificationPreferences: { ...prefs, [key]: value } }); // update instantly
    try {
      const { user: updated } = await store.auth.updateMe({ notificationPreferences: { [key]: value } });
      setUser(updated);
    } catch (error) {
      setUser(previous);
      toast.show(error.message, 'error');
    }
  };

  // Fills an EMPTY account with sample subscriptions and history
  // (the "seedDemoData" Cloud Function), handy for a presentation.
  const addSamples = () => {
    showAlert('Add sample data?', 'Adds 10 sample subscriptions with a few months of simulated payments. Only works while your account has no subscriptions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add samples',
        onPress: async () => {
          setSeeding(true);
          try {
            const result = await store.addSampleData();
            toast.show(`Added ${result.subscriptions} sample subscriptions`);
          } catch (error) {
            toast.show(error.message, 'error');
          } finally {
            setSeeding(false);
          }
        },
      },
    ]);
  };

  const confirmLogout = () => {
    showAlert('Log out?', 'You will need to log in again to see your data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Text style={styles.title} accessibilityRole="header">
        Profile
      </Text>

      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.since}>Member since {formatDate(user?.createdAt)}</Text>
        </View>
        <AppButton title="Edit" size="small" variant="secondary" icon="create-outline" onPress={() => router.push('/edit-profile')} />
      </Card>

      <SectionHeader title="Demo linked accounts" />
      <Card>
        <Text style={styles.explain}>
          Account linking is simulated. These demo accounts are built into PayPilot so you can try auto-pay safely. PayPilot never asks for
          real bank details, card numbers, CVVs or banking passwords.
        </Text>
        {DEMO_ACCOUNTS.map((a) => (
          <View key={a.id} style={styles.account}>
            <View style={styles.accountIcon}>
              <Ionicons
                name={a.kind === 'card' ? 'card-outline' : a.kind === 'upi' ? 'phone-portrait-outline' : 'business-outline'}
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountLabel}>{a.label}</Text>
              <Text style={styles.accountProvider}>{a.provider}</Text>
            </View>
            <Text style={styles.demoTag}>DEMO</Text>
          </View>
        ))}
      </Card>

      <SectionHeader title="Notification preferences" />
      <Card style={{ paddingVertical: spacing.xs }}>
        <PreferenceRow
          title="Renewal reminders"
          description="Remind me 3 days before a subscription renews."
          value={prefs.renewalReminders !== false}
          onChange={(v) => updatePref('renewalReminders', v)}
        />
        <PreferenceRow
          title="Payment success alerts"
          description="Tell me when a demo payment succeeds. Failures are always shown."
          value={prefs.paymentAlerts !== false}
          onChange={(v) => updatePref('paymentAlerts', v)}
          last
        />
      </Card>

      <SectionHeader title="Shortcuts" />
      <Card padded={false}>
        <MenuRow icon="receipt-outline" label="Payment history" onPress={() => router.push('/payments')} />
        <MenuRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
        <MenuRow icon="pie-chart-outline" label="Insights & analytics" onPress={() => router.push('/analytics')} last />
      </Card>

      <SectionHeader title="About PayPilot" />
      <Card>
        <Text style={styles.aboutTitle}>PayPilot · Your money, on autopilot.</Text>
        <Text style={styles.explain}>
          A subscription and recurring bill manager built as a Software Engineering college project. All payments are simulated and all
          sample data is illustrative.
        </Text>
        <Text style={styles.meta}>Version 2.0.0 · data is stored in Firebase</Text>
      </Card>

      <AppButton title="Log out" variant="danger" icon="log-out-outline" onPress={confirmLogout} loading={loggingOut} />
      <AppButton title="Add sample data" variant="ghost" icon="sparkles-outline" onPress={addSamples} loading={seeding} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, fontSize: 24 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 20, fontWeight: '800' },
  name: { ...typography.h3 },
  email: { ...typography.small },
  since: { ...typography.small, fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  explain: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.sm },
  account: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountLabel: { ...typography.bodyStrong, fontSize: 14 },
  accountProvider: { ...typography.small, fontSize: 12 },
  demoTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.warning,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  prefTitle: { ...typography.bodyStrong, fontSize: 14 },
  prefDesc: { ...typography.small, fontSize: 12, marginTop: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 52 },
  menuLabel: { ...typography.bodyStrong, flex: 1, fontSize: 14.5 },
  aboutTitle: { ...typography.bodyStrong, marginBottom: spacing.xs },
  meta: { ...typography.small, fontSize: 12 },
});
