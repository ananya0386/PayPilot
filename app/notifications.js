// Screen K: Notifications (renewal reminders,
// payment results, spending-limit warnings...). Tap one to mark it as read.
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import ChipGroup from '../components/ChipGroup';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { useToast } from '../context/ToastContext';
import { useData } from '../hooks/useData';
import { store } from '../services/store';
import { NOTIFICATION_META } from '../constants/categories';
import { colors, radius, spacing, typography } from '../constants/theme';
import { timeAgo } from '../utils/format';

export default function NotificationsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data, setData, error, loading, refreshing, refresh, reload } = useData(() => store.notifications.list());
  const [filter, setFilter] = useState('all');

  const items = useMemo(() => {
    const list = data?.notifications || [];
    return filter === 'unread' ? list.filter((n) => !n.isRead) : list;
  }, [data, filter]);

  const markLocal = (predicate) =>
    setData((d) => {
      const notifications = d.notifications.map((n) => (predicate(n) ? { ...n, isRead: true } : n));
      return { notifications, unreadCount: notifications.filter((n) => !n.isRead).length };
    });

  const open = async (n) => {
    if (!n.isRead) {
      markLocal((x) => x.id === n.id);
      store.notifications.markRead(n.id).catch((err) => toast.show(err.message, 'error'));
    }
    if (n.subscriptionId) router.push(`/subscription/${n.subscriptionId}`);
  };

  const markAll = async () => {
    try {
      await store.notifications.markAllRead();
      markLocal(() => true);
      toast.show('All notifications marked as read');
    } catch (err) {
      toast.show(err.message, 'error');
    }
  };

  const unread = data?.unreadCount || 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Notifications"
        subtitle={data ? `${unread} unread` : undefined}
        right={
          unread > 0 ? (
            <Pressable onPress={markAll} hitSlop={8} accessibilityRole="button" style={styles.markAll}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : null
        }
      />
      <ChipGroup
        scrollable
        options={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: `Unread (${unread})` },
        ]}
        value={filter}
        onChange={setFilter}
        style={styles.chips}
      />

      {loading ? (
        <LoadingState message="Loading notifications…" />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={refresh}
          renderItem={({ item }) => {
            const meta = NOTIFICATION_META[item.type] || NOTIFICATION_META.insight;
            return (
              <Pressable
                onPress={() => open(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.isRead ? '' : 'Unread. '}${meta.label}. ${item.message}`}
                style={({ pressed }) => [styles.item, !item.isRead && styles.unread, pressed && { opacity: 0.8 }]}
              >
                <View style={[styles.icon, { backgroundColor: meta.soft }]}>
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.topRow}>
                    <Text style={[styles.type, { color: meta.color }]}>{meta.label}</Text>
                    <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                  </View>
                  <Text style={[styles.message, !item.isRead && styles.messageUnread]}>{item.message}</Text>
                </View>
                {!item.isRead ? <View style={styles.dot} accessibilityElementsHidden /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title={filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
              message="Renewal reminders and payment updates will appear here."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  chips: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  markAll: { paddingHorizontal: spacing.sm, minHeight: 44, justifyContent: 'center' },
  markAllText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl * 2, flexGrow: 1 },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  unread: { borderColor: '#CFDCEB', backgroundColor: '#FBFDFF' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: 12, fontWeight: '700' },
  time: { fontSize: 11.5, color: colors.textMuted },
  message: { ...typography.small, color: colors.textSecondary, marginTop: 3 },
  messageUnread: { color: colors.text, fontWeight: '500' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent, marginTop: 6 },
});
