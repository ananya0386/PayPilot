// Sends a push notification to a user's phone via Expo's push API.
//
// Cloud Functions call this after writing an in-app notification to Firestore,
// so the user also gets a real buzz on their phone.
//
// Uses Node 22's built-in fetch — no extra npm packages needed.
const { getFirestore } = require('firebase-admin/firestore');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Sends a push notification to the given user.
 *
 * @param {string} uid       - The user's Firebase UID.
 * @param {string} title     - Notification title (e.g. "Renewal reminder").
 * @param {string} body      - Notification body (e.g. "Netflix renews tomorrow.").
 * @param {object} [data]    - Optional data payload (e.g. { screen: 'notifications' }).
 *
 * Silently skips if the user has no push token stored (web users, or
 * permission was denied on the phone).
 */
async function sendPush(uid, title, body, data = {}) {
  try {
    const userSnap = await getFirestore().collection('users').doc(uid).get();
    if (!userSnap.exists) return;

    const token = userSnap.data().expoPushToken;
    if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken')) return;

    const message = {
      to: token,
      sound: 'default',
      title,
      body,
      data: { screen: 'notifications', ...data },
    };

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.warn(`Expo push API returned ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    // Push is best-effort: log but never crash the calling function.
    console.warn('Could not send push notification:', error.message);
  }
}

module.exports = { sendPush };
