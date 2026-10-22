// The add/edit subscription form. Both "Add" and "Edit" screens use this
// component, so validation and layout are written only once.
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import AppButton from './AppButton';
import Card from './Card';
import ChipGroup from './ChipGroup';
import DateField from './DateField';
import TextField from './TextField';
import { BILLING_CYCLES, CATEGORIES, STATUSES } from '../constants/categories';
import { colors, spacing, typography } from '../constants/theme';
import { addDaysToToday } from '../utils/dateMath';
import { compact, validateAmount, validateName, validateUrl } from '../utils/validation';

const EMPTY = {
  name: '',
  category: 'Entertainment',
  amount: '',
  billingCycle: 'monthly',
  nextDueDate: addDaysToToday(7),
  managementUrl: '',
  autoPayEnabled: false,
  status: 'active',
  reminder: { enabled: true, daysBefore: 3 },
};

const REMINDER_DAYS = [
  { value: 0, label: 'On the day' },
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '1 week before' },
];

export default function SubscriptionForm({ initialValues, onSubmit, submitLabel = 'Save', isEdit = false }) {
  const [values, setValues] = useState(() => ({
    ...EMPTY,
    ...initialValues,
    amount: initialValues?.amount !== undefined ? String(initialValues.amount) : '',
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const set = (key) => (value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const found = compact({
      name: validateName(values.name, 'Subscription name'),
      amount: validateAmount(values.amount),
      managementUrl: validateUrl(values.managementUrl),
      nextDueDate: values.nextDueDate ? null : 'Choose the next due date.',
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await onSubmit({
        name: values.name.trim(),
        category: values.category,
        amount: Number(values.amount),
        billingCycle: values.billingCycle,
        nextDueDate: values.nextDueDate,
        managementUrl: values.managementUrl.trim(),
        autoPayEnabled: values.autoPayEnabled,
        reminder: values.reminder,
        ...(isEdit ? { status: values.status } : {}),
      });
    } catch (error) {
      // Show per-field messages (e.g. duplicate email) next to the matching inputs.
      if (error.details) setErrors(error.details);
      setFormError(error.message);
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <TextField
        label="Subscription name"
        placeholder="e.g. Netflix, Electricity Bill"
        value={values.name}
        onChangeText={set('name')}
        error={errors.name}
        icon="pricetag-outline"
        maxLength={60}
        returnKeyType="next"
      />

      <View>
        <Text style={styles.label}>Category</Text>
        <ChipGroup options={CATEGORIES} value={values.category} onChange={set('category')} />
        {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}
      </View>

      <TextField
        label="Amount"
        placeholder="0"
        value={values.amount}
        onChangeText={(t) => set('amount')(t.replace(/[^0-9.]/g, ''))}
        error={errors.amount}
        prefix="₹"
        keyboardType="decimal-pad"
        maxLength={10}
      />

      <View>
        <Text style={styles.label}>Billing cycle</Text>
        <ChipGroup options={BILLING_CYCLES} value={values.billingCycle} onChange={set('billingCycle')} />
      </View>

      <DateField label="Next due date" value={values.nextDueDate} onChange={set('nextDueDate')} error={errors.nextDueDate} />

      <TextField
        label="Official management / cancellation link (optional)"
        placeholder="https://"
        value={values.managementUrl}
        onChangeText={set('managementUrl')}
        error={errors.managementUrl}
        icon="link-outline"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        maxLength={300}
      />

      {isEdit ? (
        <View>
          <Text style={styles.label}>Status</Text>
          <ChipGroup options={STATUSES} value={values.status} onChange={set('status')} />
        </View>
      ) : null}

      <Card style={styles.reminderCard}>
        <View style={styles.switchCard}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>Renewal reminder</Text>
            <Text style={styles.switchHint}>Get a notification before this bill renews.</Text>
          </View>
          <Switch
            value={values.reminder.enabled}
            onValueChange={(enabled) => set('reminder')({ ...values.reminder, enabled })}
            trackColor={{ true: colors.accent, false: colors.border }}
            thumbColor={colors.white}
            accessibilityLabel="Renewal reminder"
          />
        </View>
        {values.reminder.enabled ? (
          <ChipGroup
            options={REMINDER_DAYS}
            value={values.reminder.daysBefore}
            onChange={(daysBefore) => set('reminder')({ ...values.reminder, daysBefore })}
          />
        ) : null}
      </Card>

      <Card style={styles.switchCard}>
        <View style={styles.switchText}>
          <Text style={styles.switchTitle}>Demo auto-pay</Text>
          <Text style={styles.switchHint}>
            Pay this automatically with a demo account. You can set the spending limit and fallback on the Auto-Pay screen.
          </Text>
        </View>
        <Switch
          value={values.autoPayEnabled}
          onValueChange={set('autoPayEnabled')}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={colors.white}
          accessibilityLabel="Demo auto-pay"
        />
      </Card>

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      <AppButton title={submitLabel} icon="checkmark" onPress={handleSubmit} loading={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg + 2 },
  label: { ...typography.smallStrong, marginBottom: spacing.sm },
  error: { fontSize: 13, color: colors.error, marginTop: spacing.xs },
  switchCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reminderCard: { gap: spacing.md },
  switchText: { flex: 1 },
  switchTitle: { ...typography.bodyStrong },
  switchHint: { ...typography.small, fontSize: 12, marginTop: 2 },
  formError: { color: colors.error, fontSize: 14, textAlign: 'center' },
});
