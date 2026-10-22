// One transaction in a list. Successful, failed and skipped payments use
// different colours and icons so they are easy to tell apart.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ServiceIcon from './ServiceIcon';
import { PAYMENT_STATUS_META } from '../constants/categories';
import { colors, spacing, typography } from '../constants/theme';
import { capitalize, formatCurrency, formatDate } from '../utils/format';

export default function PaymentRow({ payment, onPress, showDivider = true }) {
  const meta = PAYMENT_STATUS_META[payment.status] || PAYMENT_STATUS_META.successful;
  const isSuccess = payment.status === 'successful';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${payment.subscriptionName}, ${formatCurrency(payment.amount)}, ${meta.label}, ${formatDate(payment.date)}`}
      style={({ pressed }) => [styles.row, showDivider && styles.divider, pressed && styles.pressed]}
    >
      <View>
        <ServiceIcon name={payment.subscriptionName} category={payment.category} size={40} />
        <View style={[styles.statusDot, { backgroundColor: meta.color }]}>
          <Ionicons name={meta.icon} size={12} color={colors.white} />
        </View>
      </View>
      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>
          {payment.subscriptionName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatDate(payment.date)} · {capitalize(payment.type)} · {payment.method}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, !isSuccess && { color: meta.color, textDecorationLine: 'line-through' }]}>
          {isSuccess ? '-' : ''}
          {formatCurrency(payment.amount)}
        </Text>
        <Text style={[styles.status, { color: meta.color }]}>{meta.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 64 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  pressed: { opacity: 0.7 },
  statusDot: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  middle: { flex: 1 },
  name: { ...typography.bodyStrong },
  meta: { ...typography.small, fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: '800', color: colors.text },
  status: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
