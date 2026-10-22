// Spending by category: one stacked bar plus a legend with amounts.
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_META } from '../constants/categories';
import { colors, radius, spacing, typography } from '../constants/theme';
import { formatCurrency } from '../utils/format';

// items: [{ category, monthly, percentage, count }]
export default function CategoryBreakdown({ items }) {
  const total = items.reduce((sum, i) => sum + i.monthly, 0) || 1;
  return (
    <View>
      <View style={styles.stack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {items.map((item) => (
          <View
            key={item.category}
            style={{ flex: item.monthly / total, backgroundColor: (CATEGORY_META[item.category] || CATEGORY_META.Other).color }}
          />
        ))}
      </View>
      {items.map((item) => {
        const meta = CATEGORY_META[item.category] || CATEGORY_META.Other;
        return (
          <View
            key={item.category}
            style={styles.row}
            accessible
            accessibilityLabel={`${item.category}: ${formatCurrency(item.monthly)} per month, ${item.percentage} percent`}
          >
            <View style={[styles.icon, { backgroundColor: `${meta.color}1F` }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
            </View>
            <View style={styles.middle}>
              <Text style={styles.name}>{item.category}</Text>
              <Text style={styles.count}>
                {item.count} {item.count === 1 ? 'item' : 'items'}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.amount}>{formatCurrency(item.monthly, { decimals: false })}/mo</Text>
              <Text style={styles.percent}>{item.percentage}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', height: 12, borderRadius: radius.pill, overflow: 'hidden', gap: 2, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  icon: { width: 34, height: 34, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1 },
  name: { ...typography.bodyStrong, fontSize: 14 },
  count: { ...typography.small, fontSize: 12 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '700', color: colors.text },
  percent: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
});
