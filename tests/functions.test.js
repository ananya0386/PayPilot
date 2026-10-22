// Cloud Functions + rules working together, against the local emulators
// (Auth, Firestore, Functions). Run with:  npm run test:backend
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, getDocs, collection, serverTimestamp, updateDoc } = require('firebase/firestore');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');

const PROJECT = process.env.GCLOUD_PROJECT || 'demo-paypilot';
let app;
let auth;
let db;
let fns;
let alice;
let bob;

const call = (name, data) => httpsCallable(fns, name)(data).then((r) => r.data);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const addDays = (s, n) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
let requestCounter = 0;
const rid = () => `test_request_${Date.now()}_${(requestCounter += 1)}`;

async function addSubscription(uid, id, extra = {}, autopay = null) {
  await setDoc(doc(db, 'users', uid, 'subscriptions', id), {
    userId: uid,
    name: extra.name || 'Netflix',
    category: 'Entertainment',
    amount: 649,
    currency: 'INR',
    billingCycle: 'monthly',
    nextDueDate: addDays(today(), 2),
    status: 'active',
    cancellationUrl: '',
    reminder: { enabled: true, daysBefore: 3 },
    autopayEnabled: Boolean(autopay),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...extra,
  });
  if (autopay) {
    await setDoc(doc(db, 'users', uid, 'autopayRules', id), {
      userId: uid,
      subscriptionId: id,
      enabled: true,
      spendingLimit: 1000,
      failureAction: 'notify',
      retry: { maxAttempts: 3 },
      demoAccountId: 'demo-card-1092',
      updatedAt: serverTimestamp(),
      ...autopay,
    });
  }
}

const subDoc = async (uid, id) => (await getDoc(doc(db, 'users', uid, 'subscriptions', id))).data();

async function signUp(email, name) {
  const { user } = await createUserWithEmailAndPassword(auth, email, 'Passw0rd!');
  await setDoc(doc(db, 'users', user.uid), {
    userId: user.uid,
    name,
    email,
    preferences: { renewalReminders: true, paymentAlerts: true, currency: 'INR' },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return user.uid;
}

before(async () => {
  app = initializeApp({ apiKey: 'demo-api-key', projectId: PROJECT }, 'functions-test');
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  fns = getFunctions(app, 'asia-south1');
  connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  const stamp = Date.now();
  bob = await signUp(`bob${stamp}@example.com`, 'Bob');
  await signOut(auth);
  alice = await signUp(`alice${stamp}@example.com`, 'Alice');
  test.aliceEmail = `alice${stamp}@example.com`;
  test.bobEmail = `bob${stamp}@example.com`;
});

after(async () => {
  await deleteApp(app);
});

test('successful simulation records one payment, moves the due date and notifies', async () => {
  await addSubscription(alice, 'netflix', {}, { failureAction: 'retry' });
  const due = (await subDoc(alice, 'netflix')).nextDueDate;
  const requestId = rid();
  const result = await call('simulatePayment', { subscriptionId: 'netflix', requestId, scenario: 'success' });
  assert.equal(result.outcome, 'success');
  assert.equal(result.duplicate, false);
  assert.equal(result.payment.status, 'successful');
  assert.match(result.payment.transactionRef, /^SIM-/);
  assert.equal(result.payment.billingPeriod, due);
  assert.notEqual((await subDoc(alice, 'netflix')).nextDueDate, due);
  const pay = await getDoc(doc(db, 'users', alice, 'payments', requestId));
  assert.ok(pay.exists());
  assert.equal(pay.data().simulated, true);
});

test('the same request id never creates a second payment', async () => {
  await addSubscription(alice, 'spotify', { name: 'Spotify', amount: 119 }, { spendingLimit: 200 });
  const requestId = rid();
  const first = await call('simulatePayment', { subscriptionId: 'spotify', requestId });
  const dueAfterFirst = (await subDoc(alice, 'spotify')).nextDueDate;
  const results = await Promise.allSettled([1, 2, 3, 4].map(() => call('simulatePayment', { subscriptionId: 'spotify', requestId })));
  for (const r of results) {
    assert.equal(r.status, 'fulfilled');
    assert.equal(r.value.duplicate, true);
    assert.equal(r.value.payment.id, first.payment.id);
  }
  assert.equal((await subDoc(alice, 'spotify')).nextDueDate, dueAfterFirst, 'due date moved only once');
  const all = await getDocs(collection(db, 'users', alice, 'payments'));
  assert.equal(all.docs.filter((d) => d.data().subscriptionId === 'spotify').length, 1);
});

test('amount above the spending limit is blocked without an attempt', async () => {
  await addSubscription(alice, 'power', { name: 'Electricity', category: 'Utilities', amount: 1650 }, { spendingLimit: 1500 });
  const due = (await subDoc(alice, 'power')).nextDueDate;
  const result = await call('simulatePayment', { subscriptionId: 'power', requestId: rid() });
  assert.equal(result.outcome, 'limit_exceeded');
  assert.equal(result.payment.status, 'skipped');
  assert.equal(result.payment.attemptCount, 0);
  assert.equal((await subDoc(alice, 'power')).nextDueDate, due, 'due date unchanged');
});

test('retry: declines three times, then records one failed payment', async () => {
  await addSubscription(alice, 'internet', { name: 'Internet', amount: 999 }, { spendingLimit: 1200, failureAction: 'retry' });
  const result = await call('simulatePayment', { subscriptionId: 'internet', requestId: rid(), scenario: 'decline' });
  assert.equal(result.outcome, 'failed_retry_exhausted');
  assert.equal(result.payment.attemptCount, 3);
  assert.ok(result.payment.failureReason);
});

test('retry: declines once, then succeeds on attempt 2', async () => {
  await addSubscription(alice, 'internet2', { name: 'Internet 2', amount: 999 }, { spendingLimit: 1200, failureAction: 'retry' });
  const result = await call('simulatePayment', { subscriptionId: 'internet2', requestId: rid(), scenario: 'recover' });
  assert.equal(result.outcome, 'success');
  assert.equal(result.payment.attemptCount, 2);
});

test('skip: a declined payment skips the cycle and moves the due date', async () => {
  await addSubscription(alice, 'mobile', { name: 'Mobile', amount: 299 }, { spendingLimit: 500, failureAction: 'skip' });
  const due = (await subDoc(alice, 'mobile')).nextDueDate;
  const result = await call('simulatePayment', { subscriptionId: 'mobile', requestId: rid(), scenario: 'decline' });
  assert.equal(result.outcome, 'skipped');
  assert.notEqual((await subDoc(alice, 'mobile')).nextDueDate, due);
});

test('notify: a declined payment fails once and keeps the due date', async () => {
  await addSubscription(alice, 'canva', { name: 'Canva', amount: 499, category: 'Software' }, { spendingLimit: 600, failureAction: 'notify' });
  const due = (await subDoc(alice, 'canva')).nextDueDate;
  const result = await call('simulatePayment', { subscriptionId: 'canva', requestId: rid(), scenario: 'decline' });
  assert.equal(result.outcome, 'failed_notify');
  assert.equal(result.payment.attemptCount, 1);
  assert.equal((await subDoc(alice, 'canva')).nextDueDate, due);
});

test('each outcome creates a notification', async () => {
  const notes = await getDocs(collection(db, 'users', alice, 'notifications'));
  const types = new Set(notes.docs.map((d) => d.data().type));
  for (const type of ['payment_success', 'payment_failed', 'payment_skipped', 'spending_limit']) assert.ok(types.has(type), type);
});

test('auto-pay off, paused subscriptions and bad input are refused', async () => {
  await addSubscription(alice, 'manualonly', { name: 'Manual only' });
  await assert.rejects(call('simulatePayment', { subscriptionId: 'manualonly', requestId: rid() }), /Auto-pay is turned off/);
  await addSubscription(alice, 'paused', { name: 'Paused', status: 'paused' }, {});
  await assert.rejects(call('simulatePayment', { subscriptionId: 'paused', requestId: rid() }), /paused/);
  await assert.rejects(call('simulatePayment', { subscriptionId: 'netflix', requestId: 'x' }), /request id/);
  await assert.rejects(call('simulatePayment', { subscriptionId: 'netflix', requestId: rid(), scenario: 'hack' }), /Unknown/);
  await assert.rejects(call('simulatePayment', { subscriptionId: 'does-not-exist', requestId: rid() }), (e) => e.code === 'functions/not-found');
});

test('manual "mark as paid" records a payment once per bill', async () => {
  await addSubscription(alice, 'yt', { name: 'YouTube', amount: 149 });
  const result = await call('recordManualPayment', { subscriptionId: 'yt', requestId: rid(), demoAccountId: 'demo-upi-7730' });
  assert.equal(result.payment.type, 'manual');
  assert.equal(result.payment.method, 'Demo UPI •••• 7730');
});

test('a bill that is already paid cannot be paid again', async () => {
  await addSubscription(alice, 'twice', { name: 'Twice', amount: 100 }, { spendingLimit: 200 });
  const due = (await subDoc(alice, 'twice')).nextDueDate;
  await call('simulatePayment', { subscriptionId: 'twice', requestId: rid() });
  // Someone moves the due date back to the bill that was just paid...
  await updateDoc(doc(db, 'users', alice, 'subscriptions', 'twice'), { nextDueDate: due, updatedAt: serverTimestamp() });
  await assert.rejects(call('simulatePayment', { subscriptionId: 'twice', requestId: rid() }), /already paid/);
});

test("another user cannot pay or read Alice's subscription", async () => {
  await signOut(auth);
  await signInWithEmailAndPassword(auth, test.bobEmail, 'Passw0rd!');
  // Bob's call runs under Bob's account, so Alice's subscription id is simply not found.
  await assert.rejects(call('simulatePayment', { subscriptionId: 'netflix', requestId: rid() }), (e) => e.code === 'functions/not-found');
  await assert.rejects(getDoc(doc(db, 'users', alice, 'subscriptions', 'netflix')));
  await signOut(auth);
  await signInWithEmailAndPassword(auth, test.aliceEmail, 'Passw0rd!');
});

test('signed-out callers are refused', async () => {
  await signOut(auth);
  await assert.rejects(call('simulatePayment', { subscriptionId: 'netflix', requestId: rid() }), (e) => e.code === 'functions/unauthenticated');
  await signInWithEmailAndPassword(auth, test.bobEmail, 'Passw0rd!');
});

test('sample data fills an empty account once, and refuses a second time', async () => {
  // Signed in as Bob, who has no subscriptions.
  const result = await call('seedDemoData', {});
  assert.equal(result.subscriptions, 10);
  assert.ok(result.payments > 20);
  const subs = await getDocs(collection(db, 'users', bob, 'subscriptions'));
  assert.equal(subs.size, 10);
  await assert.rejects(call('seedDemoData', {}), /no subscriptions/);
});

test('scheduled reminder logic creates each reminder once', async () => {
  // Runs the same code as the scheduled function, directly against the emulator.
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  const admin = require(require.resolve('firebase-admin/app', { paths: [`${__dirname}/../functions`] }));
  if (!admin.getApps().length) admin.initializeApp({ projectId: PROJECT });
  const { sendRenewalReminders, reminderId } = require('../functions/src/reminders');
  await sendRenewalReminders(today());
  const second = await sendRenewalReminders(today());
  assert.equal(second.created, 0, 'running twice adds nothing');
  // Bob is signed in here, so read Alice's reminder with the admin SDK instead.
  const { getFirestore: adminDb } = require(require.resolve('firebase-admin/firestore', { paths: [`${__dirname}/../functions`] }));
  const canvaDue = (await adminDb().doc(`users/${alice}/subscriptions/canva`).get()).data().nextDueDate;
  const snap = await adminDb().doc(`users/${alice}/notifications/${reminderId('canva', canvaDue)}`).get();
  assert.ok(snap.exists, 'Canva (due in 2 days) got a reminder');
  assert.equal(snap.data().type, 'renewal_reminder');
});
