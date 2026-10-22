// Firestore security rules tests. Run with:  npm run test:backend
// (starts the Firestore emulator, runs these tests, then stops it)
const { test, before, after, beforeEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { assertFails, assertSucceeds, initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp, writeBatch } = require('firebase/firestore');

let env;
const ALICE = 'alice';
const BOB = 'bob';

const alice = () => env.authenticatedContext(ALICE, { email: 'alice@example.com' }).firestore();
const bob = () => env.authenticatedContext(BOB, { email: 'bob@example.com' }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const subscription = (uid, extra = {}) => ({
  userId: uid,
  name: 'Netflix',
  category: 'Entertainment',
  amount: 649,
  currency: 'INR',
  billingCycle: 'monthly',
  nextDueDate: '2026-11-02',
  startDate: '2026-01-02',
  status: 'active',
  cancellationUrl: 'https://www.netflix.com/cancelplan',
  reminder: { enabled: true, daysBefore: 3 },
  autopayEnabled: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

const profile = (uid, email, extra = {}) => ({
  userId: uid,
  name: 'Alice',
  email,
  preferences: { renewalReminders: true, paymentAlerts: true, currency: 'INR' },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-paypilot-rules',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  // Existing data written with rules turned off (like Cloud Functions do).
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', ALICE), profile(ALICE, 'alice@example.com'));
    await setDoc(doc(db, 'users', ALICE, 'subscriptions', 'sub1'), subscription(ALICE));
    await setDoc(doc(db, 'users', ALICE, 'payments', 'pay1'), { userId: ALICE, amount: 649, status: 'successful' });
    await setDoc(doc(db, 'users', ALICE, 'notifications', 'n1'), {
      userId: ALICE, type: 'payment_success', title: 'Paid', message: 'Paid', subscriptionId: 'sub1', isRead: false, createdAt: new Date(),
    });
  });
});

// ------------------------------------------------------------ authentication & ownership

test('signed-out users cannot read anything', async () => {
  await assertFails(getDoc(doc(anon(), 'users', ALICE)));
  await assertFails(getDocs(collection(anon(), 'users', ALICE, 'subscriptions')));
});

test('a user can read their own data', async () => {
  await assertSucceeds(getDoc(doc(alice(), 'users', ALICE)));
  await assertSucceeds(getDocs(collection(alice(), 'users', ALICE, 'subscriptions')));
  await assertSucceeds(getDocs(collection(alice(), 'users', ALICE, 'payments')));
});

test("a user cannot read or change another user's data", async () => {
  await assertFails(getDoc(doc(bob(), 'users', ALICE)));
  await assertFails(getDocs(collection(bob(), 'users', ALICE, 'subscriptions')));
  await assertFails(getDoc(doc(bob(), 'users', ALICE, 'payments', 'pay1')));
  await assertFails(updateDoc(doc(bob(), 'users', ALICE, 'subscriptions', 'sub1'), { amount: 1, updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(doc(bob(), 'users', ALICE, 'subscriptions', 'sub1')));
  await assertFails(setDoc(doc(bob(), 'users', ALICE, 'subscriptions', 'sub2'), subscription(ALICE)));
});

// ------------------------------------------------------------ profile

test('profile: create own with matching email; not with a fake email or another uid', async () => {
  await assertSucceeds(setDoc(doc(bob(), 'users', BOB), profile(BOB, 'bob@example.com')));
  await env.clearFirestore();
  await assertFails(setDoc(doc(bob(), 'users', BOB), profile(BOB, 'someone@else.com')));
  await assertFails(setDoc(doc(bob(), 'users', ALICE), profile(ALICE, 'bob@example.com')));
});

test('profile: name can change, email and extra fields cannot', async () => {
  const ref = doc(alice(), 'users', ALICE);
  await assertSucceeds(updateDoc(ref, { name: 'Alice K', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { email: 'new@example.com', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { isAdmin: true, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { name: '', updatedAt: serverTimestamp() }));
});

test('profile: passwords can never be stored', async () => {
  await assertFails(updateDoc(doc(alice(), 'users', ALICE), { password: 'secret123', updatedAt: serverTimestamp() }));
});

// ------------------------------------------------------------ subscriptions

test('subscriptions: valid create, update and delete succeed', async () => {
  const ref = doc(alice(), 'users', ALICE, 'subscriptions', 'new1');
  await assertSucceeds(setDoc(ref, subscription(ALICE, { name: 'Spotify' })));
  await assertSucceeds(updateDoc(ref, { amount: 199, updatedAt: serverTimestamp() }));
  await assertSucceeds(deleteDoc(ref));
});

test('subscriptions: invalid data is rejected', async () => {
  const ref = doc(alice(), 'users', ALICE, 'subscriptions', 'bad');
  await assertFails(setDoc(ref, subscription(ALICE, { amount: -5 })));
  await assertFails(setDoc(ref, subscription(ALICE, { amount: '649' })));
  await assertFails(setDoc(ref, subscription(ALICE, { name: '' })));
  await assertFails(setDoc(ref, subscription(ALICE, { category: 'Gambling' })));
  await assertFails(setDoc(ref, subscription(ALICE, { billingCycle: 'daily' })));
  await assertFails(setDoc(ref, subscription(ALICE, { nextDueDate: 'next week' })));
  await assertFails(setDoc(ref, subscription(ALICE, { cancellationUrl: 'javascript:alert(1)' })));
  await assertFails(setDoc(ref, subscription(ALICE, { userId: BOB })));
  await assertFails(setDoc(ref, subscription(ALICE, { cardNumber: '4111111111111111' })));
  await assertFails(setDoc(ref, subscription(ALICE, { createdAt: new Date('2020-01-01') })));
});

test('subscriptions: createdAt cannot be changed later', async () => {
  await assertFails(updateDoc(doc(alice(), 'users', ALICE, 'subscriptions', 'sub1'), { createdAt: new Date('2020-01-01'), updatedAt: serverTimestamp() }));
});

// ------------------------------------------------------------ auto-pay rules

const rule = (extra = {}) => ({
  userId: ALICE,
  subscriptionId: 'sub1',
  enabled: true,
  spendingLimit: 1000,
  failureAction: 'retry',
  retry: { maxAttempts: 3 },
  demoAccountId: 'demo-card-1092',
  updatedAt: serverTimestamp(),
  ...extra,
});

test('auto-pay rules: valid rule for an existing subscription succeeds', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'users', ALICE, 'autopayRules', 'sub1'), rule()));
});

test('auto-pay rules: invalid or orphan rules are rejected', async () => {
  const ref = doc(alice(), 'users', ALICE, 'autopayRules', 'sub1');
  await assertFails(setDoc(ref, rule({ spendingLimit: null }))); // enabled needs a limit
  await assertFails(setDoc(ref, rule({ spendingLimit: -1 })));
  await assertFails(setDoc(ref, rule({ failureAction: 'pay-anyway' })));
  await assertFails(setDoc(ref, rule({ demoAccountId: 'real-bank-account' })));
  await assertFails(setDoc(ref, rule({ retry: { maxAttempts: 50 } })));
  await assertFails(setDoc(ref, rule({ subscriptionId: 'other' })));
  await assertFails(setDoc(doc(alice(), 'users', ALICE, 'autopayRules', 'missing'), rule({ subscriptionId: 'missing' })));
});

test('auto-pay rules: a new subscription and its rule can be saved together (one batch)', async () => {
  const db = alice();
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', ALICE, 'subscriptions', 'sub2'), subscription(ALICE, { autopayEnabled: true }));
  batch.set(doc(db, 'users', ALICE, 'autopayRules', 'sub2'), rule({ subscriptionId: 'sub2' }));
  await assertSucceeds(batch.commit());
});

// ------------------------------------------------------------ payments

test('payments: the app can read but never write payment records', async () => {
  await assertSucceeds(getDoc(doc(alice(), 'users', ALICE, 'payments', 'pay1')));
  await assertFails(setDoc(doc(alice(), 'users', ALICE, 'payments', 'fake'), { userId: ALICE, amount: 649, status: 'successful' }));
  await assertFails(updateDoc(doc(alice(), 'users', ALICE, 'payments', 'pay1'), { status: 'failed' }));
  await assertFails(deleteDoc(doc(alice(), 'users', ALICE, 'payments', 'pay1')));
});

// ------------------------------------------------------------ notifications

const note = (extra = {}) => ({
  userId: ALICE, type: 'renewal_reminder', title: 'Renewal reminder', message: 'Netflix renews in 2 days.', subscriptionId: 'sub1', isRead: false, createdAt: serverTimestamp(), ...extra,
});

test('notifications: the app may create reminders but not payment results', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'users', ALICE, 'notifications', 'r1'), note()));
  await assertFails(setDoc(doc(alice(), 'users', ALICE, 'notifications', 'r2'), note({ type: 'payment_success' })));
  await assertFails(setDoc(doc(alice(), 'users', ALICE, 'notifications', 'r3'), note({ isRead: true })));
  await assertFails(setDoc(doc(bob(), 'users', ALICE, 'notifications', 'r4'), note()));
});

test('notifications: only the read flag can be changed', async () => {
  const ref = doc(alice(), 'users', ALICE, 'notifications', 'n1');
  await assertSucceeds(updateDoc(ref, { isRead: true }));
  await assertFails(updateDoc(ref, { message: 'changed' }));
  await assertFails(updateDoc(doc(bob(), 'users', ALICE, 'notifications', 'n1'), { isRead: true }));
});

test('notifications: a reminder with an existing id cannot be overwritten', async () => {
  await assertFails(setDoc(doc(alice(), 'users', ALICE, 'notifications', 'n1'), note()));
});

// ------------------------------------------------------------ summaries

test('summaries: own rule-based summary for a month; nothing else', async () => {
  const summary = (extra = {}) => ({
    userId: ALICE, month: '2026-10', totals: { monthly: 649 }, categoryBreakdown: [], recommendations: ['Tip'], generator: 'rule-based', generatedAt: serverTimestamp(), ...extra,
  });
  await assertSucceeds(setDoc(doc(alice(), 'users', ALICE, 'summaries', '2026-10'), summary()));
  await assertFails(setDoc(doc(alice(), 'users', ALICE, 'summaries', 'latest'), summary({ month: 'latest' })));
  await assertFails(setDoc(doc(alice(), 'users', ALICE, 'summaries', '2026-10'), summary({ generator: 'gpt' })));
  await assertFails(setDoc(doc(bob(), 'users', ALICE, 'summaries', '2026-10'), summary()));
});

test('unknown collections are denied', async () => {
  await assertFails(setDoc(doc(alice(), 'admin', 'x'), { a: 1 }));
  await assertFails(setDoc(doc(alice(), 'users', ALICE, 'secrets', 'x'), { a: 1 }));
});
