// Screen E: Subscriptions and bills list with search, category filter and
// status filter. Tap a card for details; use the ⋮ button to edit or delete.
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { showAlert } from '../../utils/alert';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ChipGroup from '../../components/ChipGroup';
import SubscriptionCard from '../../components/SubscriptionCard';
import { IconButton } from '../../components/AppHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useData } from '../../hooks/useData';
import { useToast } from '../../context/ToastContext';
import { store } from '../../services/store';
import { CATEGORIES } from '../../constants/categories';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';

const CATEGORY_FILTERS = [{ value: 'All', label: 'All' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))];
const STATUS_FILTERS = [
  { value: 'all', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Monthly cost of one subscription, to show the total of the filtered list.
function monthly(s) {
  if (s.billingCycle === 'weekly') return (s.amount * 52) / 12;
  if (s.billingCycle === 'quarterly') return s.amount / 3;
  if (s.billingCycle === 'yearly') return s.amount / 12;
  return s.amount;
}

export default function SubscriptionsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data, error, loading, refreshing, refresh, reload, setData } = useData(() => store.subscriptions.list());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('all');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.subscriptions || []).filter(
      (s) =>
        (category === 'All' || s.category === category) &&
        (status === 'all' || s.status === status) &&
        (!term || s.name.toLowerCase().includes(term))
    );
  }, [data, search, category, status]);

  const activeTotal = filtered.filter((s) => s.status === 'active').reduce((sum, s) => sum + monthly(s), 0);

  const confirmDelete = (sub) => {
    showAlert('Delete subscription?', `"${sub.name}" will be removed. Its past payment history is kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await store.subscriptions.remove(sub.id);
            setData((d) => ({ ...d, subscriptions: d.subscriptions.filter((s) => s.id !== sub.id) }));
            toast.show(`${sub.name} deleted`);
          } catch (err) {
            toast.show(err.message, 'error');
          }
        },
      },
    ]);
  };

  const showActions = (sub) => {
    showAlert(sub.name, 'What would you like to do?', [
      { text: 'Edit', onPress: () => router.push(`/subscription/${sub.id}/edit`) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(sub) },
      { text: 'Close', style: 'cancel' },
    ]);
  };

  const hasFilters = search || category !== 'All' || status !== 'all';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">
            Bills & Subscriptions
          </Text>
          {data ? (
            <Text style={styles.subtitle}>
              {filtered.length} shown · {formatCurrency(Math.round(activeTotal))}/mo active
            </Text>
          ) : null}
        </View>
        <IconButton
          icon="add"
          label="Add subscription"
          onPress={() => router.push('/subscription/new')}
          style={styles.addBtn}
          color={colors.white}
        />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search subscriptions"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          accessibilityLabel="Search subscriptions"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filters}>
        <ChipGroup scrollable options={CATEGORY_FILTERS} value={category} onChange={setCategory} style={styles.chipRow} />
        <ChipGroup scrollable options={STATUS_FILTERS} value={status} onChange={setStatus} style={styles.chipRow} />
      </View>

      {loading ? (
        <LoadingState message="Loading subscriptions…" />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshing={refreshing}
          onRefresh={refresh}
          renderItem={({ item }) => (
            <SubscriptionCard
              subscription={item}
              onPress={() => router.push(`/subscription/${item.id}`)}
              onMore={() => showActions(item)}
            />
          )}
          ListEmptyComponent={
            hasFilters ? (
              <EmptyState icon="search-outline" title="No matches" message="Try a different search or filter." />
            ) : (
              <EmptyState
                icon="wallet-outline"
                title="No subscriptions yet"
                message="Add Netflix, your phone plan, electricity bill or anything else you pay regularly."
                actionLabel="Add Subscription"
                onAction={() => router.push('/subscription/new')}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { ...typography.h1, fontSize: 24 },
  subtitle: { ...typography.small, marginTop: 2 },
  addBtn: { backgroundColor: colors.primary },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: spacing.sm },
  filters: { gap: spacing.sm, marginTop: spacing.md },
  chipRow: { paddingHorizontal: spacing.lg },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl * 2, flexGrow: 1 },
});
