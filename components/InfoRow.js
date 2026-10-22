// "Label ........ value" row used on detail screens.
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../constants/theme';

export default function InfoRow({ icon, label, value, valueColor, last = false }) {
  return (
    <View style={[styles.row, !last && styles.divider]} accessible accessibilityLabel={`${label}: ${value}`}>
      {icon ? <Ionicons name={icon} size={18} color={colors.textSecondary} /> : null}
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor && { color: valueColor }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 48 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  label: { ...typography.small, color: colors.textSecondary, flex: 1 },
  value: { ...typography.bodyStrong, fontSize: 14, textAlign: 'right', flexShrink: 1, maxWidth: '60%' },
});
