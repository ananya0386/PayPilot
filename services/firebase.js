// The ONE place where Firebase is set up. Every other file imports `auth`,
// `db` and `functions` from here.
//
// Settings come from environment variables (see .env.example). Expo copies
// variables whose names start with EXPO_PUBLIC_ into the app when it starts,
// so after changing .env you must restart `npx expo start`.
//
// These values are NOT secret: every Firebase web/mobile app ships them.
// What protects the data is firestore.rules (each user can only reach their
// own documents). Admin/service-account keys are never used in the app.
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { authPersistence } from './authPersistence';

const useEmulators = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost';
const region = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION || 'asia-south1';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// With the local emulators no real project is needed: "demo-" projects only
// exist on your laptop.
// The emulators always use the "demo-paypilot" project, whatever .env says.
if (useEmulators) {
  firebaseConfig.apiKey = 'demo-api-key';
  firebaseConfig.projectId = 'demo-paypilot';
}

// Empty values, or the placeholders from .env.example, count as missing.
const isPlaceholder = (value) => !value || /^your-|abcdef1234567890$/.test(value);
const missing = useEmulators ? [] : ['apiKey', 'projectId', 'appId'].filter((key) => isPlaceholder(firebaseConfig[key]));

// Shown by app/_layout.js instead of crashing when .env is not filled in yet.
export const firebaseSetupError = missing.length
  ? `Firebase is not configured. Copy .env.example to .env, fill in ${missing
      .map((k) => `EXPO_PUBLIC_FIREBASE_${k.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`)
      .join(', ')}, then restart Expo.`
  : null;

export const usingEmulators = useEmulators;

let app = null;
let auth = null;
let db = null;
let functions = null;

if (!firebaseSetupError) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  // Keeps you logged in after closing the app (AsyncStorage on phones, browser storage on the web).
  auth = initializeAuth(app, { persistence: authPersistence });
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true, ignoreUndefinedProperties: true });
  functions = getFunctions(app, region);

  if (useEmulators) {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectFunctionsEmulator(functions, emulatorHost, 5001);
  }
}

export { app, auth, db, functions };
