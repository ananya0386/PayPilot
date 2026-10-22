// A compact vertical bar chart drawn with plain Views (no chart library
// needed). Bars grow in with a short animation when the data changes.
import { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { formatCurrency } from '../utils/format';

function compactAmount(value) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return formatCurrency(value);
}

// data: [{ label: 'May', value: 4200 }, ...]
export default function BarChart({ data, height = 120, highlightLast = true }) {
  const progress = useAnimatedNumber(0);
  const max = Math.max(...data.map((d) => d.value), 1);

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 550, useNativeDriver: false }).start();
  }, [data, progress]);

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`Spending chart: ${data.map((d) => `${d.label} ${formatCurrency(d.value)}`).join(', ')}`}
    >
      <View style={[styles.bars, { height }]}>
        {data.map((d, index) => {
          const isLast = highlightLast && index === data.length - 1;
          const barHeight = Math.max((d.value / max) * (height - 22), d.value > 0 ? 6 : 2);
          return (
            <View key={`${d.label}-${index}`} style={styles.column}>
              <Text style={[styles.value, isLast && styles.valueStrong]} numberOfLines={1}>
                {d.value > 0 ? compactAmount(d.value) : ''}
              </Text>
              <Animated.View
                style={[
                  styles.bar,
                  {
                    height: progress.interpolate({ inputRange: [0, 1], outputRange: [2, barHeight] }),
                    backgroundColor: isLast ? colors.accent : colors.primary,
                    opacity: isLast ? 1 : 0.85,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((d, index) => (
          <Text key={`${d.label}-l-${index}`} style={styles.label}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', maxWidth: 34, borderRadius: radius.sm - 2 },
  value: { fontSize: 10, color: colors.textSecondary, marginBottom: 4, fontWeight: '600' },
  valueStrong: { color: colors.text, fontWeight: '800' },
  labels: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  label: { flex: 1, textAlign: 'center', fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
});
