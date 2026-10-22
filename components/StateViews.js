// Loading, error and empty states, so every screen handles them the same way.
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { colors, radius, spacing, typography } from '../constants/theme';

export function LoadingState({ message = 'Loading…' }) {
  return (
    <View style={[styles.center, styles.full]} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function ErrorState({ error, onRetry, title }) {
  const notFound = error?.notFound;
  return (
    <View style={[styles.center, styles.full]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.errorSoft }]}>
        <Ionicons
          name={notFound ? 'search-outline' : 'warning-outline'}
          size={30}
          color={colors.error}
        />
      </View>
      <Text style={styles.title}>{title || (notFound ? 'Not found' : 'Something went wrong')}</Text>
      <Text style={styles.message}>{error?.message || 'Please try again.'}</Text>
      {onRetry ? <AppButton title="Try again" icon="refresh" variant="secondary" onPress={onRetry} style={styles.button} /> : null}
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, message, actionLabel, onAction, actionIcon = 'add', compact = false }) {
  return (
    <View style={[styles.center, compact ? styles.compact : styles.full]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel ? <AppButton title={actionLabel} icon={actionIcon} onPress={onAction} style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  full: { flex: 1, minHeight: 280 },
  compact: { paddingVertical: spacing.xl },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { ...typography.h3, textAlign: 'center' },
  message: { ...typography.small, textAlign: 'center', maxWidth: 320 },
  button: { marginTop: spacing.md, alignSelf: 'stretch', maxWidth: 320, width: '100%' },
});
