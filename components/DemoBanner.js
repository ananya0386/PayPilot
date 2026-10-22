// Visible reminder that payments and accounts are simulated.
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';

export default function DemoBanner({ text = 'Demo Payment Simulation: no real money moves and no real bank is contacted.', style }) {
  return (
    <View style={[styles.banner, style]} accessibilityRole="text">
      <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  text: { flex: 1, fontSize: 12.5, color: colors.primary, fontWeight: '600', lineHeight: 17 },
});
