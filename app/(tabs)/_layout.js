// Bottom navigation bar for the main sections. The round "+" in the middle
// opens the Add Subscription screen instead of being a normal tab.
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../../constants/theme';

function tabIcon(name) {
  return function TabIcon({ color, focused }) {
    return <Ionicons name={focused ? name : `${name}-outline`} size={23} color={color} />;
  };
}

function AddButton() {
  const router = useRouter();
  return (
    <View style={styles.addWrap}>
      <Pressable
        onPress={() => router.push('/subscription/new')}
        accessibilityRole="button"
        accessibilityLabel="Add subscription"
        style={({ pressed }) => [styles.addButton, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <Ionicons name="add" size={30} color={colors.primaryDark} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="subscriptions" options={{ title: 'Bills', tabBarIcon: tabIcon('wallet') }} />
      <Tabs.Screen name="add" options={{ title: 'Add', tabBarButton: () => <AddButton />, tabBarAccessibilityLabel: 'Add subscription' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Insights', tabBarIcon: tabIcon('pie-chart') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: tabIcon('person-circle') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    borderWidth: 4,
    borderColor: colors.card,
    ...shadow,
    elevation: 4,
  },
});
