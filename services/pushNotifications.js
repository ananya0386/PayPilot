// Push notification registration for phones.
// Requests permission, gets the Expo push token, and saves it to Firestore
// so Cloud Functions can send real push notifications.
//
// Silently skips on web (push tokens are only available on native).
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Show notifications even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Requests notification permission, obtains the Expo push token, and saves
 * it to the user's Firestore profile (`users/{uid}.expoPushToken`).
 *
 * Safe to call repeatedly — it won't prompt the user again if permission
 * was already granted, and it overwrites the same field each time.
 *
 * Returns the token string on success, or null if anything prevents
 * registration (web, permission denied, missing login).
 */
export async function registerForPushNotifications() {
  // Push tokens are only available on native (iOS / Android).
  if (Platform.OS === 'web') return null;

  try {
    // 1. Check / request permission.
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied.');
      return null;
    }

    // 2. Android needs a notification channel.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'PayPilot',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }

    // 3. Get the Expo push token.
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data; // e.g. "ExponentPushToken[...]"

    // 4. Save it to Firestore so Cloud Functions can use it.
    const user = auth?.currentUser;
    if (user && db) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { expoPushToken: token });
    }

    console.log('Push token registered:', token);
    return token;
  } catch (error) {
    // Non-fatal: the app works fine without push. Log and continue.
    console.warn('Could not register for push notifications:', error.message);
    return null;
  }
}
