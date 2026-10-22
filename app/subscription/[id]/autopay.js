// Screen H: Auto-Pay configuration + Demo Payment Simulation.
// The rules are saved to Firestore; the simulation itself runs in the
// "simulatePayment" Cloud Function (functions/src/payments.js).
// This screen shows the form and the result.
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { showAlert } from '../../../utils/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../../components/Screen';
import AppHeader from '../../../components/AppHeader';
import AppButton from '../../../components/AppButton';
import Card from '../../../components/Card';
import ChipGroup from '../../../components/ChipGroup';
import DemoBanner from '../../../components/DemoBanner';
import SectionHeader from '../../../components/SectionHeader';
import ServiceIcon from '../../../components/ServiceIcon';
import SimulationModal from '../../../components/SimulationModal';
import TextField from '../../../components/TextField';
import { ErrorState, LoadingState } from '../../../components/StateViews';
import { useToast } from '../../../context/ToastContext';
import { useData } from '../../../hooks/useData';
import { store } from '../../../services/store';
import { FALLBACK_ACTIONS, SIMULATION_SCENARIOS } from '../../../constants/categories';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { cycleShort, formatCurrency, formatDate } from '../../../utils/format';
import { newId } from '../../../utils/ids';
import { validateAmount } from '../../../utils/validation';

function toForm(autopay) {
  return {
    autoPayEnabled: autopay.autoPayEnabled,
    demoPaymentAccountId: autopay.demoPaymentAccountId || autopay.availableAccounts[0].id,
    spendingLimit: autopay.spendingLimit === null ? '' : String(autopay.spendingLimit),
    fallbackAction: autopay.fallbackAction,
  };
}

function sameForm(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function AutoPayScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { data, setData, error, loading, reload } = useData(async () => {
    const [{ subscription }, { autopay }] = await Promise.all([store.subscriptions.get(id), store.subscriptions.getAutopay(id)]);
    return { subscription, autopay };
  }, [id]);

  // `edits` holds the user's unsaved changes (null = showing the saved config).
  const [edits, setEdits] = useState(null);
  const [limitError, setLimitError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [scenario, setScenario] = useState('success');
  const [sim, setSim] = useState({ visible: false, result: null, error: null });

  const saved = data ? toForm(data.autopay) : null;
  const form = edits || saved;
  const dirty = Boolean(edits && saved && !sameForm(edits, saved));

  const header = <AppHeader title="Auto-Pay" subtitle={data?.subscription?.name} />;
  if (loading)
    return (
      <Screen scroll={false} header={header}>
        <LoadingState />
      </Screen>
    );
  if (error && !data)
    return (
      <Screen scroll={false} header={header}>
        <ErrorState error={error} onRetry={reload} />
      </Screen>
    );

  const sub = data.subscription;
  const accounts = data.autopay.availableAccounts;
  const account = accounts.find((a) => a.id === form.demoPaymentAccountId);
  const limit = Number(form.spendingLimit);
  const limitValid = form.spendingLimit !== '' && !validateAmount(form.spendingLimit);
  const overLimit = limitValid && sub.amount > limit;
  const update = (key) => (value) => {
    setEdits((current) => ({ ...(current || saved), [key]: value }));
    if (key === 'spendingLimit') setLimitError(null);
  };

  const save = async () => {
    if (form.autoPayEnabled || form.spendingLimit !== '') {
      const problem = validateAmount(form.spendingLimit, 'Spending limit');
      if (problem) {
        setLimitError(problem);
        return false;
      }
    }
    setSaving(true);
    try {
      const { autopay } = await store.subscriptions.updateAutopay(sub.id, {
        autoPayEnabled: form.autoPayEnabled,
        demoPaymentAccountId: form.demoPaymentAccountId,
        spendingLimit: form.spendingLimit === '' ? null : Number(form.spendingLimit),
        fallbackAction: form.fallbackAction,
      });
      setData((d) => ({ ...d, autopay }));
      setEdits(null);
      toast.show('Auto-pay configuration saved');
      return true;
    } catch (err) {
      if (err.details?.spendingLimit) setLimitError(err.details.spendingLimit);
      toast.show(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const runSimulation = async () => {
    // A fresh id for every press, so one press can never save two payments.
    const simulationRequestId = newId('sim');
    setSim({ visible: true, result: null, error: null });
    try {
      const result = await store.subscriptions.simulate(sub.id, { simulationRequestId, scenario });
      setSim({ visible: true, result, error: null });
    } catch (err) {
      setSim({ visible: true, result: null, error: err });
    }
  };

  const simulate = () => {
    if (dirty) {
      showAlert('Save changes first?', 'The simulation uses your saved configuration.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save & simulate', onPress: async () => (await save()) && runSimulation() },
      ]);
      return;
    }
    runSimulation();
  };

  const closeSimulation = () => {
    setSim({ visible: false, result: null, error: null });
    reload(); // due date / history may have changed
  };

  const fallback = FALLBACK_ACTIONS.find((f) => f.value === form.fallbackAction);
  const fallbackSentence = {
    retry: 'PayPilot will retry, up to 3 attempts in total.',
    notify: 'PayPilot will stop and notify you to pay manually.',
    skip: 'PayPilot will skip this billing cycle and notify you.',
  }[form.fallbackAction];

  return (
    <Screen keyboard header={header}>
      <DemoBanner />

      <Card style={styles.subRow}>
        <ServiceIcon name={sub.name} category={sub.category} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.subName}>{sub.name}</Text>
          <Text style={styles.subMeta}>Next due {formatDate(sub.nextDueDate)}</Text>
        </View>
        <Text style={styles.subAmount}>
          {formatCurrency(sub.amount)}
          <Text style={styles.subCycle}>{cycleShort(sub.billingCycle)}</Text>
        </Text>
      </Card>

      <Card style={styles.switchCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>Enable auto-pay</Text>
          <Text style={styles.switchHint}>Pay {sub.name} automatically from a demo account.</Text>
        </View>
        <Switch
          value={form.autoPayEnabled}
          onValueChange={update('autoPayEnabled')}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={colors.white}
          accessibilityLabel="Enable auto-pay"
        />
      </Card>

      <SectionHeader title="Demo payment account" />
      <View style={styles.options}>
        {accounts.map((a) => {
          const selected = a.id === form.demoPaymentAccountId;
          return (
            <Pressable
              key={a.id}
              onPress={() => update('demoPaymentAccountId')(a.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={a.label}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Ionicons
                name={a.kind === 'card' ? 'card-outline' : a.kind === 'upi' ? 'phone-portrait-outline' : 'business-outline'}
                size={20}
                color={colors.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{a.label}</Text>
                <Text style={styles.optionDesc}>{a.provider}</Text>
              </View>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? colors.primary : colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Per-transaction spending limit" />
      <TextField
        value={form.spendingLimit}
        onChangeText={(t) => update('spendingLimit')(t.replace(/[^0-9.]/g, ''))}
        prefix="₹"
        keyboardType="decimal-pad"
        placeholder="e.g. 1000"
        maxLength={10}
        error={limitError}
        helper="Payments above this amount are blocked and you are notified."
        accessibilityLabel="Spending limit"
      />
      <ChipGroup
        options={[500, 1000, 2000, 5000].map((v) => ({ value: String(v), label: formatCurrency(v) }))}
        value={form.spendingLimit}
        onChange={update('spendingLimit')}
      />

      <SectionHeader title="If a payment fails" />
      <View style={styles.options}>
        {FALLBACK_ACTIONS.map((f) => {
          const selected = f.value === form.fallbackAction;
          return (
            <Pressable
              key={f.value}
              onPress={() => update('fallbackAction')(f.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${f.label}: ${f.description}`}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <View style={[styles.fallbackIcon, selected && { backgroundColor: colors.primary }]}>
                <Ionicons name={f.icon} size={18} color={selected ? colors.white : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{f.label}</Text>
                <Text style={styles.optionDesc}>{f.description}</Text>
              </View>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? colors.primary : colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.summary}>
        <Text style={styles.summaryKicker}>CURRENT CONFIGURATION{dirty ? ' (UNSAVED)' : ''}</Text>
        {form.autoPayEnabled ? (
          <Text style={styles.summaryText}>
            When {sub.name} ({formatCurrency(sub.amount)}) is due, PayPilot will pay it from {account?.label} if the amount is within{' '}
            {limitValid ? formatCurrency(limit) : 'your limit'}. If the payment fails, {fallbackSentence.charAt(0).toLowerCase()}
            {fallbackSentence.slice(1)}
          </Text>
        ) : (
          <Text style={styles.summaryText}>
            Auto-pay is off. {sub.name} must be paid manually. Fallback is set to “{fallback.label}”.
          </Text>
        )}
        {form.autoPayEnabled && overLimit ? (
          <View style={styles.warning}>
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <Text style={styles.warningText}>{formatCurrency(sub.amount)} is above this limit, so the payment will be blocked.</Text>
          </View>
        ) : null}
      </Card>

      <AppButton title="Save Configuration" icon="save-outline" onPress={save} loading={saving} disabled={!dirty} />

      <SectionHeader title="Demo Payment Simulation" />
      <Card>
        <Text style={styles.simText}>
          Run the saved rules now. Choose how the demo bank responds to show each outcome. A new payment record and notification are
          created.
        </Text>
        <Text style={styles.simLabel}>Demo bank response</Text>
        <ChipGroup options={SIMULATION_SCENARIOS} value={scenario} onChange={setScenario} />
        <AppButton title="Simulate Payment" icon="play" variant="accent" onPress={simulate} style={{ marginTop: spacing.lg }} />
        {!saved.autoPayEnabled ? <Text style={styles.simHint}>Auto-pay is off. Turn it on and save before simulating.</Text> : null}
      </Card>

      <SimulationModal
        visible={sim.visible}
        result={sim.result}
        error={sim.error}
        onClose={closeSimulation}
        onViewHistory={() => {
          closeSimulation();
          router.push({ pathname: '/payments', params: { subscriptionId: sub.id, name: sub.name } });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  subName: { ...typography.bodyStrong, fontSize: 16 },
  subMeta: { ...typography.small, fontSize: 12.5 },
  subAmount: { fontSize: 17, fontWeight: '800', color: colors.text },
  subCycle: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  switchCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchTitle: { ...typography.bodyStrong },
  switchHint: { ...typography.small, fontSize: 12.5, marginTop: 2 },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md + 2,
    minHeight: 56,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#F6F9FC' },
  optionTitle: { ...typography.bodyStrong, fontSize: 14.5 },
  optionDesc: { ...typography.small, fontSize: 12.5, marginTop: 1 },
  fallbackIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  summaryKicker: { ...typography.caption, color: colors.primary, marginBottom: spacing.xs },
  summaryText: { ...typography.body, fontSize: 14, color: colors.primaryDark },
  warning: { flexDirection: 'row', gap: spacing.xs + 2, marginTop: spacing.sm, alignItems: 'flex-start' },
  warningText: { flex: 1, fontSize: 13, color: '#B45309', fontWeight: '600' },
  simText: { ...typography.small, color: colors.text },
  simLabel: { ...typography.smallStrong, marginTop: spacing.md, marginBottom: spacing.sm },
  simHint: { ...typography.small, fontSize: 12, color: colors.warning, marginTop: spacing.sm, textAlign: 'center' },
});
