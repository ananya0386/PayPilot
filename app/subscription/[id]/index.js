// Screen G: Subscription details, with actions to edit, delete, configure
// auto-pay, mark as paid (demo), view history and open the official page.
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '../../../utils/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '../../../components/Screen';
import AppHeader, { IconButton } from '../../../components/AppHeader';
import AppButton from '../../../components/AppButton';
import Card from '../../../components/Card';
import InfoRow from '../../../components/InfoRow';
import Pill from '../../../components/Pill';
import PaymentRow from '../../../components/PaymentRow';
import SectionHeader from '../../../components/SectionHeader';
import ServiceIcon from '../../../components/ServiceIcon';
import { EmptyState, ErrorState, LoadingState } from '../../../components/StateViews';
import { useToast } from '../../../context/ToastContext';
import { useData } from '../../../hooks/useData';
import { store } from '../../../services/store';
import { DEMO_ACCOUNT_LABELS, FALLBACK_ACTIONS, SUBSCRIPTION_STATUS_META } from '../../../constants/categories';
import { colors, spacing, typography } from '../../../constants/theme';
import { capitalize, cycleLabel, dueLabel, formatCurrency, formatDate } from '../../../utils/format';
import { newId } from '../../../utils/ids';

export default function SubscriptionDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { data, error, loading, reload, refreshing, refresh } = useData(() => store.subscriptions.get(id), [id]);
  const [paying, setPaying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const header = (
    <AppHeader
      title="Details"
      right={
        data ? <IconButton icon="create-outline" label="Edit subscription" onPress={() => router.push(`/subscription/${id}/edit`)} /> : null
      }
    />
  );

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
          title={error.notFound ? 'Subscription not found' : undefined}
          onRetry={error.notFound ? undefined : reload}
        />
      </Screen>
    );
  }

  const s = data.subscription;
  const statusMeta = SUBSCRIPTION_STATUS_META[s.status];
  const fallback = FALLBACK_ACTIONS.find((f) => f.value === s.fallbackAction);

  const openManagementUrl = async () => {
    try {
      await Linking.openURL(s.managementUrl);
    } catch {
      toast.show('Could not open the link on this phone.', 'error');
    }
  };

  const confirmDelete = () => {
    showAlert('Delete subscription?', `"${s.name}" will be removed. Its past payment history is kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await store.subscriptions.remove(s.id);
            toast.show(`${s.name} deleted`);
            router.back();
          } catch (err) {
            setDeleting(false);
            toast.show(err.message, 'error');
          }
        },
      },
    ]);
  };

  // Records a manual DEMO payment and moves the due date to the next cycle.
  const markPaid = () => {
    const pay = async (accountId) => {
      setPaying(true);
      try {
        await store.subscriptions.payManually(s.id, { simulationRequestId: newId('man'), demoPaymentAccountId: accountId });
        toast.show(`Demo payment recorded for ${s.name}`);
        reload();
      } catch (err) {
        toast.show(err.message, 'error');
      } finally {
        setPaying(false);
      }
    };
    showAlert('Mark as paid (demo)', `Record a manual demo payment of ${formatCurrency(s.amount)}? No real money moves.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pay with Demo Card', onPress: () => pay('demo-card-1092') },
      { text: 'Pay with Demo Account', onPress: () => pay('demo-acc-4821') },
    ]);
  };

  return (
    <Screen header={header} refreshing={refreshing} onRefresh={refresh}>
      <Card style={styles.hero}>
        <ServiceIcon name={s.name} category={s.category} size={64} />
        <Text style={styles.name}>{s.name}</Text>
        <Text style={styles.category}>{s.category}</Text>
        <Text style={styles.amount}>
          {formatCurrency(s.amount)}
          <Text style={styles.cycle}> / {s.billingCycle.replace('ly', '')}</Text>
        </Text>
        <View style={styles.pills}>
          <Pill label={statusMeta.label} color={statusMeta.color} background={statusMeta.soft} />
          <Pill
            label={s.autoPayEnabled ? 'Auto-pay on' : 'Auto-pay off'}
            icon="repeat"
            color={s.autoPayEnabled ? colors.primary : colors.textSecondary}
            background={s.autoPayEnabled ? colors.primarySoft : colors.divider}
          />
        </View>
      </Card>

      <Card style={{ paddingVertical: spacing.xs }}>
        <InfoRow
          icon="calendar-outline"
          label="Next due date"
          value={`${formatDate(s.nextDueDate)}\n${s.status === 'active' ? dueLabel(s.nextDueDate) : capitalize(s.status)}`}
        />
        <InfoRow icon="sync-outline" label="Billing cycle" value={cycleLabel(s.billingCycle)} />
        <InfoRow icon="pricetags-outline" label="Category" value={s.category} />
        <InfoRow icon="pulse-outline" label="Status" value={statusMeta.label} valueColor={statusMeta.color} />
        <InfoRow
          icon="alarm-outline"
          label="Reminder"
          value={s.reminder?.enabled ? (s.reminder.daysBefore === 0 ? "On the due date" : `${s.reminder.daysBefore} day${s.reminder.daysBefore === 1 ? "" : "s"} before`) : "Off"}
        />
        <InfoRow icon="repeat-outline" label="Auto-pay" value={s.autoPayEnabled ? 'Enabled (demo)' : 'Disabled'} />
        <InfoRow icon="shield-outline" label="Spending limit" value={s.spendingLimit ? formatCurrency(s.spendingLimit) : 'Not set'} />
        <InfoRow icon="git-branch-outline" label="Fallback action" value={fallback ? fallback.label : '—'} />
        <InfoRow icon="card-outline" label="Payment account" value={DEMO_ACCOUNT_LABELS[s.demoPaymentAccountId] || 'Not set'} last />
      </Card>

      <View style={styles.actions}>
        <AppButton title="Configure Auto-Pay" icon="repeat" onPress={() => router.push(`/subscription/${s.id}/autopay`)} />
        {s.status === 'active' ? (
          <AppButton title="Mark as paid (demo)" icon="checkmark-done-outline" variant="secondary" onPress={markPaid} loading={paying} />
        ) : null}
        {s.managementUrl ? (
          <AppButton title="Manage / cancel on official site" icon="open-outline" variant="outline" onPress={openManagementUrl} />
        ) : null}
      </View>

      <SectionHeader
        title="Recent payments"
        actionLabel="View all"
        onAction={() => router.push({ pathname: '/payments', params: { subscriptionId: s.id, name: s.name } })}
      />
      <Card style={{ paddingVertical: spacing.xs }}>
        {data.recentPayments.length === 0 ? (
          <EmptyState compact icon="receipt-outline" title="No payments yet" message="Mark it as paid or run a demo auto-pay simulation." />
        ) : (
          data.recentPayments.map((p, index) => (
            <PaymentRow
              key={p.id}
              payment={p}
              showDivider={index < data.recentPayments.length - 1}
              onPress={() => router.push(`/payments/${p.id}`)}
            />
          ))
        )}
      </Card>

      <View style={styles.actions}>
        <AppButton
          title="Edit Subscription"
          icon="create-outline"
          variant="outline"
          onPress={() => router.push(`/subscription/${s.id}/edit`)}
        />
        <AppButton title="Delete Subscription" icon="trash-outline" variant="danger" onPress={confirmDelete} loading={deleting} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  name: { ...typography.h2, marginTop: spacing.md, textAlign: 'center' },
  category: { ...typography.small },
  amount: { ...typography.amountL, fontSize: 30, marginTop: spacing.sm },
  cycle: { fontSize: 15, fontWeight: '500', color: colors.textSecondary },
  pills: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actions: { gap: spacing.sm },
});
