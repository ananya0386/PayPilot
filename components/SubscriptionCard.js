// One subscription in a list: icon, name, amount, cycle, due date and badges.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import Pill from './Pill';
import ServiceIcon from './ServiceIcon';
import { SUBSCRIPTION_STATUS_META } from '../constants/categories';
import { colors, spacing, typography } from '../constants/theme';
import { cycleShort, dueLabel, dueTone, formatCurrency } from '../utils/format';

const TONE_COLOR = { error: colors.error, warning: colors.warning, neutral: colors.textSecondary };

export default function SubscriptionCard({ subscription, onPress, onMore }) {
  const s = subscription;
  const statusMeta = SUBSCRIPTION_STATUS_META[s.status] || SUBSCRIPTION_STATUS_META.active;
  const active = s.status === 'active';
  return (
    <Card padded={false}>
      {/* The ⋮ button sits next to (not inside) the main pressable area. */}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${s.name}, ${formatCurrency(s.amount)} ${s.billingCycle}`}
        style={({ pressed }) => [styles.card, onMore && styles.withMore, pressed && styles.pressed]}
      >
        <View style={styles.top}>
          <ServiceIcon name={s.name} category={s.category} />
          <View style={styles.middle}>
            <Text style={styles.name} numberOfLines={1}>
              {s.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {s.category}
            </Text>
          </View>
          <View style={styles.amountWrap}>
            <Text style={styles.amount}>{formatCurrency(s.amount)}</Text>
            <Text style={styles.cycle}>{cycleShort(s.billingCycle)}</Text>
          </View>
        </View>
        <View style={styles.bottom}>
          <View style={styles.due}>
            <Ionicons name="calendar-outline" size={14} color={active ? TONE_COLOR[dueTone(s.nextDueDate)] : colors.textMuted} />
            <Text style={[styles.dueText, { color: active ? TONE_COLOR[dueTone(s.nextDueDate)] : colors.textMuted }]}>
              {active ? dueLabel(s.nextDueDate) : `Next: ${s.nextDueDate}`}
            </Text>
          </View>
          <View style={styles.pills}>
            {s.autoPayEnabled ? <Pill label="Auto-pay" icon="repeat" color={colors.primary} background={colors.primarySoft} /> : null}
            {!active ? <Pill label={statusMeta.label} color={statusMeta.color} background={statusMeta.soft} /> : null}
          </View>
        </View>
      </Pressable>
      {onMore ? (
        <Pressable
          onPress={onMore}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`More actions for ${s.name}`}
          style={styles.more}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, paddingVertical: spacing.md + 2 },
  withMore: { paddingRight: spacing.xxxl + spacing.xs },
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  middle: { flex: 1 },
  name: { ...typography.bodyStrong, fontSize: 16 },
  meta: { ...typography.small, marginTop: 2 },
  amountWrap: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: '800', color: colors.text },
  cycle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  more: { position: 'absolute', top: spacing.xs, right: 0, width: 44, height: 52, alignItems: 'center', justifyContent: 'center' },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  due: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dueText: { fontSize: 13, fontWeight: '600' },
  pills: { flexDirection: 'row', gap: spacing.xs },
});
