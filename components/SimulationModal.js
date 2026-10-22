// Shows a Demo Payment Simulation step by step, e.g.
//   "Checking spending limit..."  ->  "₹649 is within your ₹1,000 limit."
//   "Simulating payment..."       ->  "Demo payment successful."
// The simulatePayment Cloud Function does the work; this modal reveals its steps one at a time.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { colors, radius, spacing, typography } from '../constants/theme';

const STEP_ICON = {
  ok: { name: 'checkmark-circle', color: colors.success },
  error: { name: 'close-circle', color: colors.error },
  warning: { name: 'alert-circle', color: colors.warning },
  info: { name: 'ellipsis-horizontal-circle', color: colors.textSecondary },
};

export const OUTCOMES = {
  success: { title: 'Demo payment successful', icon: 'checkmark-circle', color: colors.success, soft: colors.successSoft },
  limit_exceeded: { title: 'Blocked by spending limit', icon: 'shield', color: colors.warning, soft: colors.warningSoft },
  failed_retry_exhausted: { title: 'Payment failed after retries', icon: 'close-circle', color: colors.error, soft: colors.errorSoft },
  failed_notify: { title: 'Payment failed: you were notified', icon: 'notifications', color: colors.error, soft: colors.errorSoft },
  skipped: { title: 'Payment skipped for this cycle', icon: 'play-skip-forward-circle', color: colors.warning, soft: colors.warningSoft },
};

export default function SimulationModal({ visible, result, error, onClose, onViewHistory }) {
  // How many steps are visible, remembered per result (a new result starts at 0).
  const [progress, setProgress] = useState({ result: null, shown: 0 });
  const shown = progress.result === result ? progress.shown : 0;
  const steps = result?.steps || [];
  const finished = result && shown >= steps.length;

  // Reveal one step every 550 ms for a clear, presentation-friendly effect.
  useEffect(() => {
    if (!result || shown >= steps.length) return undefined;
    const timer = setTimeout(() => setProgress({ result, shown: shown + 1 }), shown === 0 ? 250 : 550);
    return () => clearTimeout(timer);
  }, [result, shown, steps.length]);

  const outcome = result ? OUTCOMES[result.outcome] || OUTCOMES.success : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text style={styles.kicker}>DEMO PAYMENT SIMULATION</Text>
          <Text style={styles.title}>{result ? 'Simulation log' : error ? 'Simulation not run' : 'Contacting demo bank…'}</Text>

          {!result && !error ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : null}

          {error ? (
            <View style={[styles.result, { backgroundColor: colors.errorSoft }]}>
              <Ionicons name="alert-circle" size={22} color={colors.error} />
              <Text style={[styles.resultText, { color: colors.error }]}>{error.message}</Text>
            </View>
          ) : null}

          {result ? (
            <ScrollView style={styles.steps} contentContainerStyle={{ gap: spacing.sm + 2 }}>
              {result.duplicate ? (
                <Text style={styles.duplicate}>
                  This request was already processed, so no new payment was created. Showing the original result.
                </Text>
              ) : null}
              {steps.slice(0, shown).map((step, index) => {
                const icon = STEP_ICON[step.status] || STEP_ICON.info;
                return (
                  <View key={index} style={styles.step} accessible accessibilityLabel={step.label}>
                    <Ionicons name={icon.name} size={20} color={icon.color} />
                    <Text style={styles.stepText}>{step.label}</Text>
                  </View>
                );
              })}
              {!finished ? <ActivityIndicator color={colors.primary} style={{ alignSelf: 'flex-start', marginLeft: 2 }} /> : null}
            </ScrollView>
          ) : null}

          {finished ? (
            <View style={[styles.result, { backgroundColor: outcome.soft }]} accessibilityLiveRegion="polite">
              <Ionicons name={outcome.icon} size={24} color={outcome.color} />
              <Text style={[styles.resultText, { color: outcome.color }]}>{outcome.title}</Text>
            </View>
          ) : null}

          {finished || error ? (
            <View style={styles.actions}>
              {finished && onViewHistory ? (
                <AppButton title="View payment history" variant="outline" icon="receipt-outline" onPress={onViewHistory} />
              ) : null}
              <AppButton title="Done" onPress={onClose} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, maxHeight: '86%' },
  kicker: { ...typography.caption, color: colors.primary },
  title: { ...typography.h2, marginTop: spacing.xs, marginBottom: spacing.md },
  loading: { paddingVertical: spacing.xxl },
  steps: { flexGrow: 0 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stepText: { ...typography.body, flex: 1, fontSize: 14.5 },
  duplicate: { ...typography.small, color: colors.info, marginBottom: spacing.xs },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  resultText: { flex: 1, fontSize: 15, fontWeight: '800' },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
