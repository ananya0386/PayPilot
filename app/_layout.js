// Root of the app (Expo Router). Every screen file in app/ becomes a route.
//
// This layout:
// 1. Wraps the app in providers (safe area, login state, toasts).
// 2. Shows a branded loading screen while the saved login is checked.
// 3. Uses <Stack.Protected> so logged-out users can only see Welcome/Login/
//    Register, and logged-in users can only see the main app. Changing the
//    login state automatically moves the user to the right screens.
// 4. Registers for push notifications after sign-in and handles taps.
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { firebaseSetupError } from '../services/firebase';
import { colors, radius, spacing, typography } from '../constants/theme';

// expo-notifications is loaded only when needed, inside a try/catch. In Expo Go
// on Android, importing it at the top of the file throws an error and crashes
// the whole app, so a normal import cannot be used here.
function loadNotifications() {
  // Expo Go does not contain the native notification modules, so do not even try to load them there.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    return require('expo-notifications');
  } catch (error) {
    console.log('Notifications are not available here:', error?.message);
    return null;
  }
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  if (firebaseSetupError) return <SetupNeeded />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <RootNavigator />
          <ConfirmDialog />
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  // Tapping a phone notification opens the Notifications screen (signed-in users only).
  useEffect(() => {
    if (Platform.OS === 'web' || status !== 'signedIn') return undefined;
    const Notifications = loadNotifications();
    if (!Notifications) return undefined;
    let subscription;
    try {
      subscription = Notifications.addNotificationResponseReceivedListener(() => {
        router.push('/notifications');
      });
    } catch (error) {
      console.log('Could not listen for notification taps:', error?.message);
    }
    return () => subscription?.remove();
  }, [router, status]);

  if (status === 'loading') return <BrandedLoading />;

  const signedIn = status === 'signedIn';
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="subscription/new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="subscription/[id]/index" />
        <Stack.Screen name="subscription/[id]/edit" />
        <Stack.Screen name="subscription/[id]/autopay" />
        <Stack.Screen name="payments/index" />
        <Stack.Screen name="payments/[id]" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="edit-profile" />
      </Stack.Protected>
    </Stack>
  );
}

// Shown when the Firebase settings in .env are missing (see README, step 3).
function SetupNeeded() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <View style={[styles.brand, styles.setup]}>
      <Ionicons name="construct-outline" size={40} color={colors.accent} />
      <Text style={styles.brandName}>Firebase setup needed</Text>
      <Text style={styles.setupText}>{firebaseSetupError}</Text>
      <Text style={styles.setupText}>
        To try PayPilot without a Firebase account, set EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true and run: npm run emulators
      </Text>
    </View>
  );
}

function BrandedLoading() {
  return (
    <View style={styles.brand}>
      <View style={styles.logo}>
        <Ionicons name="paper-plane" size={34} color={colors.accent} />
      </View>
      <Text style={styles.brandName}>PayPilot</Text>
      <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
    </View>
  );
}


const styles = StyleSheet.create({
  brand: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    backgroundColor: colors.onPrimaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { ...typography.h1, color: colors.white, marginTop: spacing.lg, textAlign: 'center' },
  setup: { padding: spacing.xxl, gap: spacing.md },
  setupText: { ...typography.body, color: colors.onPrimaryMuted, textAlign: 'center', maxWidth: 420 },
});
