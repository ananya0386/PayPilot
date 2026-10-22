// Screen D: Dashboard, the home screen after login.
// All figures are calculated from your saved subscriptions and payments
// (see dashboard() in services/store.js).
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import BarChart from '../../components/BarChart';
import CategoryBreakdown from '../../components/CategoryBreakdown';
import PaymentRow from '../../components/PaymentRow';
import ServiceIcon from '../../components/ServiceIcon';
import AppButton from '../../components/AppButton';
import { IconButton } from '../../components/AppHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../hooks/useData';
import { store } from '../../services/store';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { cycleShort, dueLabel, dueTone, formatCurrency, formatLongToday, greeting } from '../../utils/format';

const QUICK_ACTIONS = [
  { icon: 'add-circle-outline', label: 'Add', href: '/subscription/new' },
  { icon: 'receipt-outline', label: 'History', href: '/payments' },
  { icon: 'pie-chart-outline', label: 'Insights', href: '/analytics' },
  { icon: 'notifications-outline', label: 'Alerts', href: '/notifications' },
];

const TONE_COLOR = { error: colors.error, warning: colors.warning, neutral: colors.textSecondary };

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useData(() => store.dashboard());
  const firstName = user?.name?.split(' ')[0] || 'there';

  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.greeting} numberOfLines={1}>
          {greeting()}, {firstName}
        </Text>
        <Text style={styles.date}>{formatLongToday()}</Text>
      </View>
      <IconButton
        icon="notifications-outline"
        label={`Notifications${data?.unreadNotifications ? `, ${data.unreadNotifications} unread` : ''}`}
        badge={data?.unreadNotifications || 0}
        onPress={() => router.push('/notifications')}
        style={styles.bell}
      />
    </View>
  );

  if (loading)
    return (
      <Screen scroll={false} header={header}>
        <LoadingState message="Loading your dashboard…" />
      </Screen>
    );
  if (error && !data)
    return (
      <Screen scroll={false} header={header}>
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    );

  const hasSubscriptions = data.totals.activeCount + data.totals.pausedCount > 0;

  return (
    <Screen header={header} refreshing={refreshing} onRefresh={refresh}>
      {/* Hero: monthly recurring spend */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Monthly recurring spending</Text>
        <Text style={styles.heroAmount} accessibilityLabel={`Monthly recurring spending ${formatCurrency(data.totals.monthly)}`}>
          {formatCurrency(data.totals.monthly)}
        </Text>
        <Text style={styles.heroSub}>
          ≈ {formatCurrency(data.totals.yearly, { decimals: false })} per year · {data.totals.activeCount} active
        </Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <View style={styles.heroStatLabelRow}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <Text style={styles.heroStatLabel}>Paid this month</Text>
            </View>
            <Text style={styles.heroStatValue}>{formatCurrency(data.thisMonth.paid.amount)}</Text>
            <Text style={styles.heroStatCount}>
              {data.thisMonth.paid.count} {data.thisMonth.paid.count === 1 ? 'payment' : 'payments'}
            </Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <View style={styles.heroStatLabelRow}>
              <View style={[styles.dot, { backgroundColor: colors.warning }]} />
              <Text style={styles.heroStatLabel}>Still due this month</Text>
            </View>
            <Text style={styles.heroStatValue}>{formatCurrency(data.thisMonth.pending.amount)}</Text>
            <Text style={styles.heroStatCount}>{data.thisMonth.pending.count} pending</Text>
          </View>
        </View>
        <View style={styles.autopayRow}>
          <Ionicons name="repeat" size={14} color={colors.accent} />
          <Text style={styles.autopayText}>
            Demo auto-pay on for {data.totals.autoPayCount} of {data.totals.activeCount}
          </Text>
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => router.push(a.href)}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            style={({ pressed }) => [styles.quick, pressed && { opacity: 0.75 }]}
          >
            <View style={styles.quickIcon}>
              <Ionicons name={a.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      {!hasSubscriptions ? (
        <Card>
          <EmptyState
            compact
            icon="wallet-outline"
            title="No subscriptions yet"
            message="Add your first subscription or bill to see totals, reminders and insights here."
            actionLabel="Add Subscription"
            onAction={() => router.push('/subscription/new')}
          />
        </Card>
      ) : (
        <>
          {/* Insight from the local demo engine */}
          {data.insight ? (
            <Card onPress={() => router.push('/analytics')} style={styles.insight} accessibilityLabel={`Insight: ${data.insight.message}`}>
              <View style={styles.insightIcon}>
                <Ionicons name="sparkles" size={18} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightKicker}>PAYPILOT INSIGHT · LOCAL DEMO ENGINE</Text>
                <Text style={styles.insightText}>{data.insight.message}</Text>
                <Text style={styles.insightLink}>See all insights</Text>
              </View>
            </Card>
          ) : null}

          {/* Upcoming payments */}
          <SectionHeader title="Upcoming payments" actionLabel="See all" onAction={() => router.push('/subscriptions')} />
          <Card padded={false}>
            {data.upcoming.length === 0 ? (
              <EmptyState compact icon="calendar-outline" title="Nothing due soon" message="No active subscriptions are due." />
            ) : (
              data.upcoming.map((s, index) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(`/subscription/${s.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.name}, ${formatCurrency(s.amount)}, ${dueLabel(s.nextDueDate)}`}
                  style={({ pressed }) => [
                    styles.upcoming,
                    index < data.upcoming.length - 1 && styles.divider,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <ServiceIcon name={s.name} category={s.category} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.upName} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={[styles.upDue, { color: TONE_COLOR[dueTone(s.nextDueDate)] }]}>{dueLabel(s.nextDueDate)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.upAmount}>
                      {formatCurrency(s.amount)}
                      <Text style={styles.upCycle}>{cycleShort(s.billingCycle)}</Text>
                    </Text>
                    {s.autoPayEnabled ? <Text style={styles.upAuto}>Auto-pay</Text> : <Text style={styles.upManual}>Manual</Text>}
                  </View>
                </Pressable>
              ))
            )}
          </Card>

          {/* Spending chart */}
          <SectionHeader title="Spending trend" actionLabel="Analytics" onAction={() => router.push('/analytics')} />
          <Card>
            <Text style={styles.cardHint}>Successful payments, last 6 months</Text>
            <BarChart data={data.trend.map((t) => ({ label: t.label, value: t.total }))} />
          </Card>

          {/* Category breakdown */}
          {data.byCategory.length > 0 ? (
            <>
              <SectionHeader title="Spending by category" />
              <Card>
                <CategoryBreakdown items={data.byCategory} />
              </Card>
            </>
          ) : null}

          {/* Recent transactions */}
          <SectionHeader title="Recent transactions" actionLabel="View all" onAction={() => router.push('/payments')} />
          <Card style={{ paddingVertical: spacing.xs }}>
            {data.recentTransactions.length === 0 ? (
              <EmptyState
                compact
                icon="receipt-outline"
                title="No payments yet"
                message="Payments you make or simulate will appear here."
              />
            ) : (
              data.recentTransactions.map((p, index) => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  showDivider={index < data.recentTransactions.length - 1}
                  onPress={() => router.push(`/payments/${p.id}`)}
                />
              ))
            )}
          </Card>

          <AppButton title="Add Subscription" icon="add" variant="secondary" onPress={() => router.push('/subscription/new')} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  greeting: { ...typography.h2, fontSize: 22 },
  date: { ...typography.small, marginTop: 2 },
  bell: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  hero: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.xl },
  heroLabel: { color: colors.onPrimaryMuted, fontSize: 13.5, fontWeight: '600' },
  heroAmount: { ...typography.amountXL, color: colors.white, marginTop: spacing.xs },
  heroSub: { color: colors.onPrimaryMuted, fontSize: 13, marginTop: 2 },
  heroStats: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    backgroundColor: colors.onPrimaryFaint,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  heroStat: { flex: 1 },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: spacing.md },
  heroStatLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  heroStatLabel: { color: colors.onPrimaryMuted, fontSize: 12, fontWeight: '600' },
  heroStatValue: { color: colors.white, fontSize: 19, fontWeight: '800', marginTop: 4 },
  heroStatCount: { color: colors.onPrimaryMuted, fontSize: 11.5, marginTop: 1 },
  autopayRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  autopayText: { color: colors.onPrimaryMuted, fontSize: 12.5, fontWeight: '600' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quick: { alignItems: 'center', gap: 6, flex: 1, minHeight: 44 },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontSize: 12.5, fontWeight: '600', color: colors.text },
  insight: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.accentSoft, borderColor: '#C7F0DE' },
  insightIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  insightKicker: { ...typography.caption, fontSize: 10, color: '#0F766E' },
  insightText: { ...typography.body, fontSize: 14, marginTop: 4 },
  insightLink: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: spacing.sm },
  upcoming: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  upName: { ...typography.bodyStrong },
  upDue: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  upAmount: { fontSize: 15, fontWeight: '800', color: colors.text },
  upCycle: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  upAuto: { fontSize: 11.5, fontWeight: '700', color: colors.primary, marginTop: 2 },
  upManual: { fontSize: 11.5, fontWeight: '600', color: colors.textMuted, marginTop: 2 },
  cardHint: { ...typography.small, fontSize: 12, marginBottom: spacing.md },
});
