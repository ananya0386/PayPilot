// Screen I: Payment history, grouped by month, with
// filters for status and payment type. Can be limited to one subscription.
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import ChipGroup from '../../components/ChipGroup';
import PaymentRow from '../../components/PaymentRow';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useData } from '../../hooks/useData';
import { store } from '../../services/store';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { formatCurrency, monthTitle } from '../../utils/format';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'successful', label: 'Successful' },
  { value: 'failed', label: 'Failed' },
  { value: 'skipped', label: 'Skipped' },
];
const TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
];

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [subscriptionId, setSubscriptionId] = useState(params.subscriptionId || '');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');

  const { data, error, loading, refreshing, refresh, reload } = useData(
    () => store.payments.list({ status, type, subscriptionId }),
    [status, type, subscriptionId]
  );

  // Group into sections by month for a clean chronological list.
  const sections = useMemo(() => {
    const groups = [];
    for (const payment of data?.payments || []) {
      const title = monthTitle(payment.date);
      let group = groups.find((g) => g.title === title);
      if (!group) {
        group = { title, data: [], total: 0 };
        groups.push(group);
      }
      group.data.push(payment);
      if (payment.status === 'successful') group.total += payment.amount;
    }
    return groups;
  }, [data]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Payment History" />
      <View style={styles.filters}>
        {subscriptionId ? (
          <Pressable
            onPress={() => setSubscriptionId('')}
            style={styles.subFilter}
            accessibilityRole="button"
            accessibilityLabel="Show all subscriptions"
          >
            <Text style={styles.subFilterText}>Only {params.name || 'this subscription'}</Text>
            <Ionicons name="close" size={16} color={colors.primary} />
          </Pressable>
        ) : null}
        <ChipGroup scrollable options={STATUS_FILTERS} value={status} onChange={setStatus} style={styles.chips} />
        <ChipGroup scrollable options={TYPE_FILTERS} value={type} onChange={setType} style={styles.chips} />
      </View>

      {loading ? (
        <LoadingState message="Loading payments…" />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={refresh}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionTotal}>{formatCurrency(section.total)} paid</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <View style={[styles.rowWrap, index === 0 && styles.first, index === section.data.length - 1 && styles.last]}>
              <PaymentRow
                payment={item}
                showDivider={index < section.data.length - 1}
                onPress={() => router.push(`/payments/${item.id}`)}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No payments found"
              message={status || type ? 'Try different filters.' : 'Payments you mark as paid or simulate with auto-pay appear here.'}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  filters: { gap: spacing.sm, paddingBottom: spacing.sm },
  chips: { paddingHorizontal: spacing.lg },
  subFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    minHeight: 34,
  },
  subFilterText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl * 2, flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, fontSize: 15 },
  sectionTotal: { ...typography.small, fontSize: 12.5, fontWeight: '600' },
  rowWrap: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.divider,
  },
  first: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, paddingTop: spacing.xs },
  last: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, borderBottomWidth: 1, paddingBottom: spacing.xs },
});
