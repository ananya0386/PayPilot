// Shares "who is logged in" with every screen (React Context).
//
// Firebase Authentication remembers the login on the device. When the app
// opens, onAuthStateChanged tells us whether someone is still logged in, and
// we then load their profile from Firestore (users/{uid}).
//
// status is one of:
//   'loading'   - waiting for Firebase to restore the saved login
//   'signedOut' - show Welcome / Login / Register
//   'signedIn'  - show the main app
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { store } from '../services/store';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    if (!auth) return undefined;
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        if (!active) return;
        setUser(null);
        setStatus('signedOut');
        return;
      }
      try {
        const profile = await store.auth.loadUser(firebaseUser);
        if (!active) return;
        setProfileError(null);
        setUser(profile);
        setStatus('signedIn');
      } catch (error) {
        // Logged in, but the profile could not be read (offline, rules not deployed...).
        if (!active) return;
        setProfileError(error);
        setUser(null);
        setStatus('signedOut');
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // The listener above also fires after these, which is harmless:
  // it loads the same profile again.
  const signIn = useCallback(({ user: newUser }) => {
    setProfileError(null);
    setUser(newUser);
    setStatus('signedIn');
  }, []);

  const login = useCallback(async (email, password) => signIn(await store.auth.login({ email, password })), [signIn]);

  const register = useCallback(async (name, email, password) => signIn(await store.auth.register({ name, email, password })), [signIn]);

  const logout = useCallback(async () => {
    await store.auth.logout();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(
    () => ({ status, user, profileError, login, register, logout, setUser }),
    [status, user, profileError, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
