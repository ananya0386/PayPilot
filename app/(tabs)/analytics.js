// Screen J: Analytics and insights (calculated in services/store.js).
// The insights come from PayPilot's LOCAL demo insight engine: simple,
// transparent rules over your stored data. No external AI is used.
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import BarChart from '../../components/BarChart';
import CategoryBreakdown from '../../components/CategoryBreakdown';
import InsightCard from '../../components/InsightCard';
import ServiceIcon from '../../components/ServiceIcon';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useData } from '../../hooks/useData';
import { store } from '../../services/store';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { dueLabel, formatCurrency } from '../../utils/format';

function Stat({ label, value, hint }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </Card>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { data, error, loading, refreshing, refresh, reload } = useData(() => store.analytics());
  const header = (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">
        Insights & Analytics
      </Text>
      <View style={styles.engineTag}>
        <Ionicons name="hardware-chip-outline" size={13} color={colors.primary} />
        <Text style={styles.engineText}>Local demo insight engine · rule-based, no external AI</Text>
      </View>
    </View>
  );

  if (loading)
    return (
      <Screen scroll={false} header={header}>
        <LoadingState message="Crunching your numbers…" />
      </Screen>
    );
  if (error && !data)
    return (
      <Screen scroll={false} header={header}>
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    );

  const change = data.trendChange.percent;
  const changeText =
    change === null
      ? 'No payments last month to compare.'
      : `${change >= 0 ? '+' : ''}${change}% vs last month (${formatCurrency(data.trendChange.previous)})`;

  return (
    <Screen header={header} refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.statsRow}>
        <Stat label="Monthly" value={formatCurrency(data.monthlyTotal, { decimals: false })} hint={`${data.activeCount} active`} />
        <Stat label="Yearly" value={formatCurrency(data.yearlyTotal, { decimals: false })} hint="projected" />
        <Stat label="Average" value={formatCurrency(data.averagePerSubscription, { decimals: false })} hint="per item / mo" />
      </View>

      {data.activeCount === 0 ? (
        <Card>
          <EmptyState
            compact
            icon="analytics-outline"
            title="Nothing to analyse yet"
            message="Add a few active subscriptions and PayPilot will chart your spending and suggest where to look."
            actionLabel="Add Subscription"
            onAction={() => router.push('/subscription/new')}
          />
        </Card>
      ) : null}

      <SectionHeader title="Recent spending trend" />
      <Card>
        <Text style={styles.trendValue}>{formatCurrency(data.trendChange.current)} so far this month</Text>
        <Text style={[styles.trendChange, change !== null && { color: change > 0 ? colors.error : colors.success }]}>{changeText}</Text>
        <View style={{ marginTop: spacing.md }}>
          <BarChart data={data.trend.map((t) => ({ label: t.label, value: t.total }))} height={140} />
        </View>
        <Text style={styles.footnote}>Totals of successful payments in each month.</Text>
      </Card>

      {data.byCategory.length > 0 ? (
        <>
          <SectionHeader title="Spending by category" />
          <Card>
            <CategoryBreakdown items={data.byCategory} />
          </Card>
        </>
      ) : null}

      <SectionHeader title="Insights for you" />
      {data.insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} />
      ))}

      {data.dueSoon.length > 0 ? (
        <>
          <SectionHeader title="Due in the next 7 days" />
          <Card padded={false}>
            {data.dueSoon.map((s, index) => (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/subscription/${s.id}`)}
                accessibilityRole="button"
                style={[styles.dueRow, index < data.dueSoon.length - 1 && styles.divider]}
              >
                <ServiceIcon name={s.name} category={s.category} size={36} />
                <Text style={styles.dueName} numberOfLines={1}>
                  {s.name}
                </Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.dueAmount}>{formatCurrency(s.amount)}</Text>
                  <Text style={styles.dueWhen}>{dueLabel(s.nextDueDate)}</Text>
                </View>
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Potential savings" />
      <Card>
        {data.savings.scenarios.length === 0 ? (
          <Text style={styles.body}>
            No overlapping non-essential subscriptions found, so there are no cancellation scenarios to suggest right now.
          </Text>
        ) : (
          data.savings.scenarios.slice(0, 5).map((s, index, list) => (
            <View key={s.subscriptionId} style={[styles.saving, index < list.length - 1 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.savingTitle}>If you cancelled {s.name}</Text>
                <Text style={styles.savingReason}>{s.reason}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.savingYear}>{formatCurrency(s.yearlySaving, { decimals: false })}/yr</Text>
                <Text style={styles.savingMonth}>{formatCurrency(s.monthlySaving)}/mo</Text>
              </View>
            </View>
          ))
        )}
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.noteText}>{data.savings.note}</Text>
        </View>
      </Card>

      <SectionHeader title="Payment outcomes (last 90 days)" />
      <View style={styles.statsRow}>
        <Stat label="Successful" value={String(data.paymentStats90Days.successful)} />
        <Stat label="Failed" value={String(data.paymentStats90Days.failed)} />
        <Stat label="Skipped" value={String(data.paymentStats90Days.skipped)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  title: { ...typography.h1, fontSize: 24 },
  engineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  engineText: { fontSize: 11.5, fontWeight: '600', color: colors.primary },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, padding: spacing.md },
  statLabel: { ...typography.caption, fontSize: 10.5 },
  statValue: { fontSize: 19, fontWeight: '800', color: colors.text, marginTop: 4 },
  statHint: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  trendValue: { ...typography.amountL, fontSize: 22 },
  trendChange: { ...typography.small, fontWeight: '600', marginTop: 2 },
  footnote: { ...typography.small, fontSize: 11.5, marginTop: spacing.md },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  dueName: { ...typography.bodyStrong, flex: 1 },
  dueAmount: { fontSize: 14, fontWeight: '800', color: colors.text },
  dueWhen: { fontSize: 12, color: colors.warning, fontWeight: '600' },
  body: { ...typography.body, fontSize: 14 },
  saving: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  savingTitle: { ...typography.bodyStrong, fontSize: 14 },
  savingReason: { ...typography.small, fontSize: 12, marginTop: 2 },
  savingYear: { fontSize: 15, fontWeight: '800', color: colors.success },
  savingMonth: { fontSize: 12, color: colors.textSecondary },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
  },
  noteText: { flex: 1, fontSize: 11.5, color: colors.textSecondary, lineHeight: 16 },
});
