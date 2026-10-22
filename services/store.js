// All of PayPilot's data operations, backed by Firebase.
//
// Screens call these functions (for example `store.subscriptions.list()`)
// and never talk to Firebase directly, so the screens did not have to change
// when storage moved from the phone to Firebase.
//
//   Firebase Authentication  -> accounts, login, password reset
//   Cloud Firestore          -> users/{uid} and its subcollections
//   Cloud Functions          -> demo payments and sample data (trusted code)
//
// Firestore layout (every document also stores userId):
//   users/{uid}                              profile + preferences
//   users/{uid}/subscriptions/{subId}        bills and subscriptions
//   users/{uid}/autopayRules/{subId}         one auto-pay rule per subscription
//   users/{uid}/payments/{paymentId}         simulated payments (written only by Cloud Functions)
//   users/{uid}/notifications/{id}           in-app notifications
//   users/{uid}/summaries/{YYYY-MM}          rule-based monthly spending summaries
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { DEMO_ACCOUNTS } from '../constants/categories';
import { daysUntil, toDateString, today } from '../utils/dateMath';
import { formatCurrency } from '../utils/format';
import { monthlyEquivalent, round2 } from '../utils/money';
import { auth, db, functions } from './firebase';
import { AppError, toAppError } from './errors';
import { categoryTotals, dueWithin, generateInsights, savingsScenarios } from './insights';

export { AppError };

const DEFAULT_REMINDER = { enabled: true, daysBefore: 3 };
const DEFAULT_PREFERENCES = { renewalReminders: true, paymentAlerts: true, currency: 'INR' };

// ---------------------------------------------------------------- helpers

function uid() {
  const user = auth?.currentUser;
  if (!user) throw new AppError('Please log in again.');
  return user.uid;
}

const userDoc = (id = uid()) => doc(db, 'users', id);
const userCol = (name) => collection(db, 'users', uid(), name);
const userItem = (name, id) => doc(db, 'users', uid(), name, id);

// Firestore Timestamps -> ISO text, which is what the screens expect.
function toIso(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return value;
}

// Wraps a store function so every error becomes a friendly AppError.
const safe = (fn) =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw toAppError(error);
    }
  };

// Calls a Cloud Function by name and returns its result.
async function callFunction(name, data) {
  const result = await httpsCallable(functions, name)(data);
  return result.data;
}

function profileForApp(id, data) {
  return {
    id,
    name: data.name,
    email: data.email,
    notificationPreferences: { ...DEFAULT_PREFERENCES, ...(data.preferences || {}) },
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

// Firestore subscription (+ its auto-pay rule) -> the shape the screens use.
function subscriptionForApp(snap, rule) {
  const s = snap.data();
  return {
    id: snap.id,
    userId: s.userId,
    name: s.name,
    category: s.category,
    amount: s.amount,
    currency: s.currency || 'INR',
    billingCycle: s.billingCycle,
    nextDueDate: s.nextDueDate,
    startDate: s.startDate || null,
    status: s.status,
    managementUrl: s.cancellationUrl || '',
    reminder: { ...DEFAULT_REMINDER, ...(s.reminder || {}) },
    autoPayEnabled: Boolean(s.autopayEnabled),
    spendingLimit: rule?.spendingLimit ?? null,
    fallbackAction: rule?.failureAction || 'notify',
    demoPaymentAccountId: rule?.demoAccountId || null,
    createdAt: toIso(s.createdAt),
    updatedAt: toIso(s.updatedAt),
  };
}

function paymentForApp(snap) {
  const p = snap.data();
  return { id: snap.id, ...p, date: toIso(p.date), createdAt: toIso(p.createdAt), simulationRequestId: snap.id };
}

function notificationForApp(snap) {
  const n = snap.data({ serverTimestamps: 'estimate' });
  return { id: snap.id, ...n, createdAt: toIso(n.createdAt) || new Date().toISOString() };
}

// Checks the form values again before saving (the security rules check them a third time).
function cleanSubscription(values) {
  const errors = {};
  const name = String(values.name || '').trim();
  const amount = Number(values.amount);
  if (!name) errors.name = 'Subscription name is required.';
  else if (name.length > 60) errors.name = 'Subscription name must be at most 60 characters.';
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Amount must be greater than zero.';
  else if (amount > 1000000) errors.amount = 'Amount is too large.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.nextDueDate || '')) errors.nextDueDate = 'Choose the next due date.';
  const url = String(values.managementUrl || '').trim();
  if (url && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(url)) errors.managementUrl = 'Enter a full link starting with https://';
  if (Object.keys(errors).length) throw new AppError(Object.values(errors)[0], errors);

  const reminder = values.reminder || DEFAULT_REMINDER;
  return {
    name,
    category: values.category,
    amount: round2(amount),
    currency: 'INR',
    billingCycle: values.billingCycle,
    nextDueDate: values.nextDueDate,
    status: values.status || 'active',
    cancellationUrl: url,
    reminder: { enabled: Boolean(reminder.enabled), daysBefore: Math.min(Math.max(parseInt(reminder.daysBefore, 10) || 0, 0), 30) },
    autopayEnabled: Boolean(values.autoPayEnabled),
  };
}

// Default rule when auto-pay is switched on without settings: the first demo
// account and a limit of amount + 25%, rounded up to ₹100.
function defaultRule(subscriptionId, amount) {
  return {
    userId: uid(),
    subscriptionId,
    enabled: true,
    spendingLimit: Math.ceil((amount * 1.25) / 100) * 100,
    failureAction: 'notify',
    retry: { maxAttempts: 3 },
    demoAccountId: DEMO_ACCOUNTS[0].id,
    updatedAt: serverTimestamp(),
  };
}

function notificationRecord(type, title, message, subscriptionId = null) {
  return { userId: uid(), type, title, message, subscriptionId, isRead: false, createdAt: serverTimestamp() };
}

async function loadSubscriptions() {
  const [subsSnap, rulesSnap] = await Promise.all([getDocs(userCol('subscriptions')), getDocs(userCol('autopayRules'))]);
  const rules = Object.fromEntries(rulesSnap.docs.map((d) => [d.id, d.data()]));
  return subsSnap.docs.map((d) => subscriptionForApp(d, rules[d.id]));
}

async function loadSubscription(id) {
  const [subSnap, ruleSnap] = await Promise.all([getDoc(userItem('subscriptions', id)), getDoc(userItem('autopayRules', id))]);
  if (!subSnap.exists()) throw new AppError('Subscription not found.', null, { notFound: true });
  return subscriptionForApp(subSnap, ruleSnap.exists() ? ruleSnap.data() : null);
}

// The user's payments, newest first (a student's history is small enough to filter on the phone).
async function loadPayments(max = 300) {
  const snap = await getDocs(query(userCol('payments'), orderBy('date', 'desc'), limit(max)));
  return snap.docs.map(paymentForApp);
}

async function loadProfile() {
  const snap = await getDoc(userDoc());
  return snap.exists() ? snap.data() : null;
}

// Development-friendly reminders: when the app opens it adds a "renews soon"
// notification for anything due within its reminder window. The deployed
// scheduled Cloud Function does the same thing once a day even when the app
// is closed. Both use the same document id, so there are never duplicates.
async function createRenewalReminders(subs, preferences) {
  if (preferences?.renewalReminders === false) return;
  for (const sub of subs) {
    if (sub.status !== 'active' || !sub.reminder.enabled) continue;
    const days = daysUntil(sub.nextDueDate);
    if (days < 0 || days > sub.reminder.daysBefore) continue;
    const ref = userItem('notifications', `reminder_${sub.id}_${sub.nextDueDate}`);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;
    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
    const how = sub.autoPayEnabled ? 'Demo auto-pay is on.' : 'Auto-pay is off, so remember to pay it.';
    await setDoc(
      ref,
      notificationRecord('renewal_reminder', 'Renewal reminder', `${sub.name} (${formatCurrency(sub.amount)}) renews ${when}. ${how}`, sub.id)
    );
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;

// Successful payment totals for the last 6 months (oldest first), for charts.
function monthlyTrend(payments) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: MONTHS[d.getMonth()], total: 0 });
  }
  for (const p of payments) {
    const month = months.find((m) => m.key === monthKey(new Date(p.date)));
    if (month && p.status === 'successful') month.total = round2(month.total + p.amount);
  }
  return months;
}

// Monthly estimate: weekly x 52 / 12, quarterly / 3, yearly / 12 (see utils/money.js).
function totalsFor(subs) {
  const active = subs.filter((s) => s.status === 'active');
  const monthly = round2(active.reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.billingCycle), 0));
  return { active, monthly };
}

const withDays = (sub) => ({ ...sub, daysUntilDue: daysUntil(sub.nextDueDate) });

async function unreadCount() {
  const snap = await getDocs(query(userCol('notifications'), where('isRead', '==', false)));
  return snap.size;
}

// ---------------------------------------------------------------- accounts

let registering = null; // lets the login listener wait while a new profile is being written

const authApi = {
  // Called by AuthContext whenever Firebase reports a logged-in user
  // (including when the app reopens and the saved login is restored).
  async loadUser(firebaseUser) {
    if (registering) await registering.catch(() => {});
    const ref = doc(db, 'users', firebaseUser.uid);
    let snap = await getDoc(ref);
    if (!snap.exists()) {
      // e.g. an account created in the Firebase Console: give it a profile.
      await setDoc(ref, {
        userId: firebaseUser.uid,
        name: firebaseUser.displayName || (firebaseUser.email || 'PayPilot user').split('@')[0],
        email: firebaseUser.email,
        preferences: DEFAULT_PREFERENCES,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      snap = await getDoc(ref);
    }
    return profileForApp(firebaseUser.uid, snap.data());
  },

  async register({ name, email, password }) {
    const work = (async () => {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(user, { displayName: name.trim() });
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid), {
        userId: user.uid,
        name: name.trim(),
        email: user.email,
        preferences: DEFAULT_PREFERENCES,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(
        doc(collection(db, 'users', user.uid, 'notifications')),
        notificationRecord(
          'welcome',
          'Welcome to PayPilot',
          `Welcome to PayPilot, ${name.trim().split(' ')[0]}! Add your first subscription, or load sample data from your Profile.`
        )
      );
      await batch.commit();
      return user;
    })();
    registering = work;
    try {
      const user = await work;
      return { user: await authApi.loadUser(user) };
    } finally {
      registering = null;
    }
  },

  async login({ email, password }) {
    const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { user: await authApi.loadUser(user) };
  },

  async logout() {
    await signOut(auth);
  },

  async resetPassword(email) {
    await sendPasswordResetEmail(auth, email.trim());
  },

  // Name and notification preferences. (The email is the login, so it is not changed here.)
  async updateMe(changes) {
    const current = await loadProfile();
    if (!current) throw new AppError('Your profile could not be found. Please log in again.');
    const update = { updatedAt: serverTimestamp() };
    if (changes.name !== undefined) {
      const name = String(changes.name).trim();
      if (!name || name.length > 60) throw new AppError('Enter a name of up to 60 characters.', { name: 'Enter a name of up to 60 characters.' });
      update.name = name;
      await updateProfile(auth.currentUser, { displayName: name });
    }
    if (changes.notificationPreferences) {
      update.preferences = { ...DEFAULT_PREFERENCES, ...(current.preferences || {}), ...changes.notificationPreferences };
    }
    await updateDoc(userDoc(), update);
    return { user: profileForApp(uid(), await loadProfile()) };
  },
};

// ---------------------------------------------------------------- subscriptions

const subscriptions = {
  async list() {
    const list = await loadSubscriptions();
    // Active first, then by due date.
    list.sort((a, b) =>
      (a.status === 'active') !== (b.status === 'active') ? (a.status === 'active' ? -1 : 1) : a.nextDueDate.localeCompare(b.nextDueDate)
    );
    return { subscriptions: list };
  },

  async get(id) {
    const subscription = await loadSubscription(id);
    const recent = await getDocs(query(userCol('payments'), where('subscriptionId', '==', id), orderBy('date', 'desc'), limit(5)));
    return { subscription, recentPayments: recent.docs.map(paymentForApp) };
  },

  async create(values) {
    const data = cleanSubscription(values);
    const ref = doc(userCol('subscriptions'));
    const batch = writeBatch(db);
    batch.set(ref, { ...data, userId: uid(), startDate: today(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    if (data.autopayEnabled) batch.set(userItem('autopayRules', ref.id), defaultRule(ref.id, data.amount));
    await batch.commit();
    return { subscription: await loadSubscription(ref.id) };
  },

  // Changes the existing document (it never creates a second one).
  async update(id, changes) {
    const existing = await loadSubscription(id);
    const data = cleanSubscription({ ...existing, ...changes });
    const batch = writeBatch(db);
    batch.update(userItem('subscriptions', id), { ...data, updatedAt: serverTimestamp() });
    const ruleRef = userItem('autopayRules', id);
    const rule = await getDoc(ruleRef);
    if (rule.exists()) {
      batch.update(ruleRef, { enabled: data.autopayEnabled, updatedAt: serverTimestamp() });
    } else if (data.autopayEnabled) {
      batch.set(ruleRef, defaultRule(id, data.amount));
    }
    await batch.commit();
    return { subscription: await loadSubscription(id) };
  },

  // Deletes the subscription, its auto-pay rule and its reminders.
  // Payment history is kept on purpose.
  async remove(id) {
    const reminders = await getDocs(
      query(userCol('notifications'), where('subscriptionId', '==', id), where('type', '==', 'renewal_reminder'))
    );
    const batch = writeBatch(db);
    batch.delete(userItem('subscriptions', id));
    batch.delete(userItem('autopayRules', id));
    reminders.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },

  // ------------------------------------------------------------ auto-pay

  async getAutopay(id) {
    const sub = await loadSubscription(id);
    return { autopay: autopayInfo(sub) };
  },

  async updateAutopay(id, { autoPayEnabled, spendingLimit, fallbackAction, demoPaymentAccountId }) {
    const sub = await loadSubscription(id);
    if (autoPayEnabled && !(spendingLimit > 0)) {
      throw new AppError('Set a spending limit to enable auto-pay.', { spendingLimit: 'Set a spending limit to enable auto-pay.' });
    }
    const batch = writeBatch(db);
    batch.set(userItem('autopayRules', id), {
      userId: uid(),
      subscriptionId: id,
      enabled: Boolean(autoPayEnabled),
      spendingLimit: spendingLimit > 0 ? round2(spendingLimit) : null,
      failureAction: fallbackAction,
      retry: { maxAttempts: 3 },
      demoAccountId: demoPaymentAccountId || DEMO_ACCOUNTS[0].id,
      updatedAt: serverTimestamp(),
    });
    // Copied onto the subscription so lists can show the auto-pay badge without reading every rule.
    batch.update(userItem('subscriptions', id), { autopayEnabled: Boolean(autoPayEnabled), updatedAt: serverTimestamp() });
    batch.set(
      doc(userCol('notifications')),
      notificationRecord(
        'autopay_updated',
        'Auto-pay settings',
        autoPayEnabled
          ? `Demo auto-pay enabled for ${sub.name}: limit ${formatCurrency(spendingLimit)}, fallback "${fallbackAction}".`
          : `Demo auto-pay turned off for ${sub.name}.`,
        id
      )
    );
    await batch.commit();
    return { autopay: autopayInfo(await loadSubscription(id)) };
  },

  // DEMO PAYMENT SIMULATION. Runs in the "simulatePayment" Cloud Function
  // (functions/src/payments.js). No real money moves. `scenario` tells the
  // pretend bank what to do: 'success', 'decline' or 'recover' (declines once).
  async simulate(id, { simulationRequestId, scenario = 'success' }) {
    const result = await callFunction('simulatePayment', { subscriptionId: id, requestId: simulationRequestId, scenario });
    const subscription = await loadSubscription(id);
    return { ...result, subscription };
  },

  // "Mark as paid" (demo): the "recordManualPayment" Cloud Function records it.
  async payManually(id, { simulationRequestId, demoPaymentAccountId }) {
    const result = await callFunction('recordManualPayment', {
      subscriptionId: id,
      requestId: simulationRequestId,
      demoAccountId: demoPaymentAccountId,
    });
    return { ...result, subscription: await loadSubscription(id) };
  },
};

function autopayInfo(sub) {
  return {
    autoPayEnabled: sub.autoPayEnabled,
    spendingLimit: sub.spendingLimit,
    fallbackAction: sub.fallbackAction,
    demoPaymentAccountId: sub.demoPaymentAccountId,
    availableAccounts: DEMO_ACCOUNTS,
  };
}

// ---------------------------------------------------------------- payments (read-only for the app)

const payments = {
  async list({ status, type, subscriptionId } = {}) {
    const all = await loadPayments();
    return {
      payments: all.filter(
        (p) => (!status || p.status === status) && (!type || p.type === type) && (!subscriptionId || p.subscriptionId === subscriptionId)
      ),
    };
  },

  async get(id) {
    const snap = await getDoc(userItem('payments', id));
    if (!snap.exists()) throw new AppError('Payment not found.', null, { notFound: true });
    return { payment: paymentForApp(snap) };
  },
};

// ---------------------------------------------------------------- notifications

const notifications = {
  async list() {
    const [subs, profile] = await Promise.all([loadSubscriptions(), loadProfile()]);
    await createRenewalReminders(subs, profile?.preferences);
    const snap = await getDocs(query(userCol('notifications'), orderBy('createdAt', 'desc'), limit(100)));
    const list = snap.docs.map(notificationForApp);
    return { notifications: list, unreadCount: list.filter((n) => !n.isRead).length };
  },

  async markRead(id) {
    await updateDoc(userItem('notifications', id), { isRead: true });
  },

  async markAllRead() {
    const unread = await getDocs(query(userCol('notifications'), where('isRead', '==', false)));
    const batch = writeBatch(db);
    unread.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
    await batch.commit();
  },
};

// ---------------------------------------------------------------- dashboard & analytics

async function dashboard() {
  const [subs, history, profile] = await Promise.all([loadSubscriptions(), loadPayments(), loadProfile()]);
  await createRenewalReminders(subs, profile?.preferences);
  const { active, monthly } = totalsFor(subs);

  const now = new Date();
  const endOfMonth = toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const paid = history.filter((p) => p.status === 'successful' && monthKey(new Date(p.date)) === monthKey(now));
  const pending = active.filter((s) => s.nextDueDate <= endOfMonth); // still due this month (or overdue)

  return {
    today: today(),
    totals: {
      monthly,
      yearly: round2(monthly * 12),
      activeCount: active.length,
      pausedCount: subs.filter((s) => s.status === 'paused').length,
      autoPayCount: active.filter((s) => s.autoPayEnabled).length,
    },
    thisMonth: {
      paid: { amount: round2(paid.reduce((sum, p) => sum + p.amount, 0)), count: paid.length },
      pending: { amount: round2(pending.reduce((sum, s) => sum + s.amount, 0)), count: pending.length },
    },
    upcoming: active
      .filter((s) => daysUntil(s.nextDueDate) >= -7)
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
      .slice(0, 5)
      .map(withDays),
    recentTransactions: history.slice(0, 5),
    byCategory: categoryTotals(active),
    trend: monthlyTrend(history),
    insight: generateInsights(subs, history)[0] || null,
    unreadNotifications: await unreadCount(),
  };
}

async function analytics() {
  const [subs, history] = await Promise.all([loadSubscriptions(), loadPayments()]);
  const { active, monthly } = totalsFor(subs);
  const trend = monthlyTrend(history);
  const current = trend[5].total;
  const previous = trend[4].total;
  const since90 = Date.now() - 90 * 86400000;
  const recent = history.filter((p) => Date.parse(p.date) >= since90);
  const count = (status) => recent.filter((p) => p.status === status).length;
  const byCategory = categoryTotals(active);
  const insights = generateInsights(subs, history);

  // Save this month's rule-based summary to Firestore (users/{uid}/summaries/YYYY-MM).
  // It is a convenience copy, so a failure here does not stop the screen.
  const month = today().slice(0, 7);
  setDoc(userItem('summaries', month), {
    userId: uid(),
    month,
    totals: { monthly, yearly: round2(monthly * 12), activeCount: active.length, paidThisMonth: current },
    categoryBreakdown: byCategory.map((c) => ({ category: c.category, monthly: c.monthly, count: c.count, percentage: c.percentage })),
    recommendations: insights.slice(0, 10).map((i) => i.message || i.title || ''),
    generator: 'rule-based',
    generatedAt: serverTimestamp(),
  }).catch((error) => console.warn('Could not save the spending summary:', error.message));

  return {
    monthlyTotal: monthly,
    yearlyTotal: round2(monthly * 12),
    averagePerSubscription: active.length ? round2(monthly / active.length) : 0,
    activeCount: active.length,
    byCategory,
    trend,
    trendChange: { current, previous, percent: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null },
    paymentStats90Days: { successful: count('successful'), failed: count('failed'), skipped: count('skipped') },
    dueSoon: dueWithin(active, 7).map(withDays),
    insights,
    savings: savingsScenarios(active),
  };
}

// ---------------------------------------------------------------- everything screens can use

const wrapAll = (obj) => Object.fromEntries(Object.entries(obj).map(([key, fn]) => [key, safe(fn)]));

export const store = {
  auth: wrapAll(authApi),
  subscriptions: wrapAll(subscriptions),
  payments: wrapAll(payments),
  notifications: wrapAll(notifications),
  dashboard: safe(dashboard),
  analytics: safe(analytics),
  // Fills an empty account with sample subscriptions and history ("seedDemoData" Cloud Function).
  addSampleData: safe(() => callFunction('seedDemoData', {})),
};
