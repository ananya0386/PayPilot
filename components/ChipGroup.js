// A row of selectable chips. Used for filters and for small "pick one"
// choices (category, billing cycle, status).
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

// options: array of strings, or of { value, label }
export default function ChipGroup({ options, value, onChange, scrollable = false, style }) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const chips = items.map((item) => {
    const selected = item.value === value;
    return (
      <Pressable
        key={String(item.value)}
        onPress={() => onChange(item.value)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={item.label}
        style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
      >
        <Text style={[styles.text, selected && styles.selectedText]}>{item.label}</Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroller} contentContainerStyle={[styles.row, style]}>
        {chips}
      </ScrollView>
    );
  }
  return <View style={[styles.row, styles.wrap, style]}>{chips}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  scroller: { flexGrow: 0, flexShrink: 0 },
  wrap: { flexWrap: 'wrap' },
  chip: {
    minHeight: 38,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  text: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  selectedText: { color: colors.white },
});
