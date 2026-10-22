// One insight from the local demo insight engine.
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import { colors, radius, spacing, typography } from '../constants/theme';

const SEVERITY = {
  info: { icon: 'bulb-outline', color: colors.info, soft: colors.infoSoft },
  warning: { icon: 'time-outline', color: colors.warning, soft: colors.warningSoft },
  error: { icon: 'alert-circle-outline', color: colors.error, soft: colors.errorSoft },
};

export default function InsightCard({ insight }) {
  const meta = SEVERITY[insight.severity] || SEVERITY.info;
  return (
    <Card style={styles.card}>
      <View style={[styles.icon, { backgroundColor: meta.soft }]}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.message}>{insight.message}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: { width: 36, height: 36, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { ...typography.bodyStrong, marginBottom: 2 },
  message: { ...typography.small, color: colors.text },
});
