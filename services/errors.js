// Turns Firebase errors into short messages a user can understand.
// Screens show `error.message`; forms can also use `error.details` (per field).

export class AppError extends Error {
  constructor(message, details = null, { notFound = false, code = null } = {}) {
    super(message);
    this.details = details;
    this.notFound = notFound;
    this.code = code;
  }
}

const MESSAGES = {
  // Authentication
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password is too weak. Use at least 8 characters with letters and numbers.',
  'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/network-request-failed': 'No connection to Firebase. Check your internet (or that the emulators are running) and try again.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled in the Firebase Console (Authentication > Sign-in method).',
  'auth/configuration-not-found': 'Firebase Authentication is not set up yet. Open the Firebase Console and click Authentication > Get started.',
  'auth/requires-recent-login': 'Please log out and log in again, then retry.',
  // Firestore
  'permission-denied': 'You do not have permission to do that. (Firestore security rules blocked it.)',
  unavailable: 'Firebase could not be reached. Check your internet connection and try again.',
  'failed-precondition': null, // use the server's message
  'not-found': null,
  'deadline-exceeded': 'Firebase took too long to answer. Please try again.',
  // Cloud Functions (codes look like "functions/not-found")
  'functions/unavailable': 'The payment service could not be reached. Are the Cloud Functions deployed (or the emulators running)?',
  'functions/internal': 'The server could not finish that. If the Cloud Functions are not deployed yet, see the README.',
  'functions/unauthenticated': 'Please log in again.',
};

const FIELD = {
  'auth/email-already-in-use': 'email',
  'auth/invalid-email': 'email',
  'auth/weak-password': 'password',
};

export function toAppError(error) {
  if (error instanceof AppError) return error;
  const code = error?.code || '';
  const shortCode = code.replace(/^(functions|firestore)\//, '');
  const notFound = shortCode === 'not-found';
  const message = MESSAGES[code] ?? MESSAGES[shortCode] ?? (error?.message || 'Something went wrong. Please try again.');
  const finalMessage = message || error?.message || 'Something went wrong. Please try again.';
  const details = FIELD[code] ? { [FIELD[code]]: finalMessage } : null;
  if (__DEV__ && !(error instanceof AppError)) console.warn('[PayPilot]', code || 'error', error?.message);
  return new AppError(finalMessage, details, { notFound, code });
}
