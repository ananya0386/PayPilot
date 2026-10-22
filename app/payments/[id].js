// Screen I (details): one transaction,
// including the attempt log of a simulated auto-payment.
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import AppHeader from '../../components/AppHeader';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import DemoBanner from '../../components/DemoBanner';
import InfoRow from '../../components/InfoRow';
import SectionHeader from '../../components/SectionHeader';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { useData } from '../../hooks/useData';
import { store } from '../../services/store';
import { PAYMENT_STATUS_META } from '../../constants/categories';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { capitalize, formatCurrency, formatDate, formatDateTime } from '../../utils/format';

export default function PaymentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data, error, loading, reload } = useData(() => store.payments.get(id), [id]);
  const header = <AppHeader title="Transaction" />;

  if (loading)
    return (
      <Screen scroll={false} header={header}>
        <LoadingState />
      </Screen>
    );
  if (error && !data) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState
          error={error}
          title={error.notFound ? 'Payment not found' : undefined}
          onRetry={error.notFound ? undefined : reload}
        />
      </Screen>
    );
  }

  const p = data.payment;
  const meta = PAYMENT_STATUS_META[p.status];

  return (
    <Screen header={header}>
      <Card style={styles.hero}>
        <View style={[styles.statusIcon, { backgroundColor: meta.soft }]}>
          <Ionicons name={meta.icon} size={36} color={meta.color} />
        </View>
        <Text style={[styles.amount, p.status !== 'successful' && { color: meta.color }]}>{formatCurrency(p.amount)}</Text>
        <Text style={styles.service}>{p.subscriptionName}</Text>
        <Text style={[styles.status, { color: meta.color }]}>{meta.label}</Text>
      </Card>

      <Card style={{ paddingVertical: spacing.xs }}>
        <InfoRow label="Date & time" value={formatDateTime(p.date)} />
        <InfoRow label="Payment type" value={capitalize(p.type)} />
        <InfoRow label="Demo account" value={p.method} />
        <InfoRow label="Category" value={p.category || '—'} />
        <InfoRow label="Attempts" value={String(p.attemptCount)} />
        <InfoRow label="Status" value={meta.label} valueColor={meta.color} />
        {p.billingPeriod ? <InfoRow label="Bill due date" value={formatDate(p.billingPeriod)} /> : null}
        {p.transactionRef ? <InfoRow label="Demo transaction ref" value={p.transactionRef} /> : null}
        {p.failureReason ? <InfoRow label="Failure reason" value={p.failureReason} valueColor={meta.color} /> : null}
        <InfoRow label="Request ID" value={p.id} last />
      </Card>

      {p.note ? (
        <Card style={styles.note}>
          <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.noteText}>{p.note}</Text>
        </Card>
      ) : null}

      {p.attempts?.length ? (
        <>
          <SectionHeader title="Attempt log" />
          <Card style={{ gap: spacing.sm }}>
            {p.attempts.map((a) => (
              <View key={a.attempt} style={styles.attempt}>
                <Ionicons
                  name={a.result === 'approved' ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={a.result === 'approved' ? colors.success : colors.error}
                />
                <Text style={styles.attemptText}>
                  Attempt {a.attempt}: demo bank {a.result}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <DemoBanner text="Demo transaction: no real money moved and no bank was contacted." />

      <AppButton
        title="Open subscription"
        variant="outline"
        icon="open-outline"
        onPress={() => router.push(`/subscription/${p.subscriptionId}`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  statusIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  amount: { ...typography.amountL, fontSize: 32, marginTop: spacing.md },
  service: { ...typography.bodyStrong, marginTop: spacing.xs },
  status: { fontSize: 14, fontWeight: '800', marginTop: spacing.xs },
  note: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  noteText: { ...typography.small, color: colors.text, flex: 1 },
  attempt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
  },
  attemptText: { ...typography.body, fontSize: 14 },
});
