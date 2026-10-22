// Web browser: remember the login in the browser's local storage.
// (Phones use authPersistence.native.js instead; Expo picks the right file.)
import { browserLocalPersistence } from 'firebase/auth';

export const authPersistence = browserLocalPersistence;
