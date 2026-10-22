// DEMO PAYMENT SIMULATION (trusted, runs on the server).
//
// No real money ever moves. The "bank" is the bankSays() function below and
// the app chooses how it behaves (approve, decline, or decline once) so every
// outcome can be demonstrated. This code runs in Cloud Functions, so the app
// cannot fake a successful payment: Firestore security rules do not let the
// app write payment records at all.
const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const { accountLabel, col, formatINR, userRef } = require('./common');
const { advanceByCycle } = require('./dates');

const SCENARIOS = ['success', 'decline', 'recover'];
const REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,80}$/;

function requireUser(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Please log in again.');
  return request.auth.uid;
}

function checkInput(data) {
  const { subscriptionId, requestId } = data || {};
  if (typeof subscriptionId !== 'string' || !subscriptionId || subscriptionId.length > 128 || subscriptionId.includes('/')) {
    throw new HttpsError('invalid-argument', 'A subscription id is required.');
  }
  if (typeof requestId !== 'string' || !REQUEST_ID_RE.test(requestId)) {
    throw new HttpsError('invalid-argument', 'A valid request id is required.');
  }
  return { subscriptionId, requestId };
}

// Shape returned to the app (Timestamps become ISO text).
function paymentForApp(id, data) {
  const toIso = (t) => (t && typeof t.toDate === 'function' ? t.toDate().toISOString() : t || null);
  return { id, ...data, date: toIso(data.date), createdAt: toIso(data.createdAt) };
}

const transactionRef = (requestId) => `SIM-${requestId.replace(/[^A-Za-z0-9]/g, '').slice(-10).toUpperCase()}`;

// Throws if a successful payment for this subscription and billing date
// already exists (so one bill can never be "paid" twice).
async function assertNotAlreadyPaid(tx, uid, subscriptionId, billingPeriod) {
  const paid = await tx.get(
    col(uid, 'payments')
      .where('subscriptionId', '==', subscriptionId)
      .where('billingPeriod', '==', billingPeriod)
      .where('status', '==', 'successful')
      .limit(1)
  );
  if (!paid.empty) {
    throw new HttpsError('already-exists', `The bill due on ${billingPeriod} is already paid.`);
  }
}

// Runs the auto-pay rules for one subscription. Pure logic, no database:
// returns what happened so the caller can save it.
function decide({ sub, rule, scenario, maxAttempts }) {
  const amount = formatINR(sub.amount);
  const limit = formatINR(rule.spendingLimit);
  const steps = [
    { label: `Demo auto-pay is on (${accountLabel(rule.demoAccountId)}).`, status: 'ok' },
    { label: 'Checking spending limit...', status: 'info' },
  ];
  const bankSays = (attempt) => (scenario === 'decline' || (scenario === 'recover' && attempt === 1) ? 'declined' : 'approved');
  const attempts = [];

  // 1. Over the limit: block it without trying.
  if (sub.amount > rule.spendingLimit) {
    steps.push({ label: `${amount} is above your ${limit} limit.`, status: 'error' });
    steps.push({ label: 'Payment blocked. No attempt was made.', status: 'error' });
    return {
      outcome: 'limit_exceeded',
      status: 'skipped',
      moveDueDate: false,
      failureReason: 'Amount is above the spending limit.',
      note: 'Blocked: amount is above the spending limit.',
      steps,
      attempts,
      alert: { type: 'spending_limit', title: 'Auto-pay blocked', message: `Demo auto-pay for ${sub.name} was blocked: ${amount} is above your ${limit} limit.` },
    };
  }

  // 2. Within the limit: try to pay (several times if the fallback is "retry").
  steps.push({ label: `${amount} is within your ${limit} limit.`, status: 'ok' });
  steps.push({ label: 'Simulating payment...', status: 'info' });
  const tries = rule.failureAction === 'retry' ? maxAttempts : 1;
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    const result = bankSays(attempt);
    attempts.push({ attempt, result });
    steps.push({ label: `Attempt ${attempt} of ${tries}: demo bank ${result}.`, status: result === 'approved' ? 'ok' : 'error' });
    if (result === 'approved') break;
  }

  // 3. Decide the outcome using the failure-handling rule.
  if (attempts[attempts.length - 1].result === 'approved') {
    steps.push({ label: 'Demo payment successful.', status: 'ok' });
    return {
      outcome: 'success',
      status: 'successful',
      moveDueDate: true,
      failureReason: null,
      note: attempts.length > 1 ? `Succeeded on attempt ${attempts.length}.` : 'Approved on the first attempt.',
      steps,
      attempts,
      alert: { type: 'payment_success', title: 'Payment successful', message: `Demo payment of ${amount} for ${sub.name} succeeded.`, optional: true },
    };
  }
  if (rule.failureAction === 'retry') {
    steps.push({ label: `Gave up after ${attempts.length} attempts.`, status: 'error' });
    return {
      outcome: 'failed_retry_exhausted',
      status: 'failed',
      moveDueDate: false,
      failureReason: `Declined by the demo bank ${attempts.length} times.`,
      note: `Failed after ${attempts.length} attempts.`,
      steps,
      attempts,
      alert: { type: 'payment_failed', title: 'Payment failed', message: `Demo payment for ${sub.name} failed after ${attempts.length} attempts. Please pay it manually.` },
    };
  }
  if (rule.failureAction === 'skip') {
    steps.push({ label: 'Fallback "skip": this billing cycle was skipped.', status: 'warning' });
    return {
      outcome: 'skipped',
      status: 'skipped',
      moveDueDate: true,
      failureReason: 'Declined by the demo bank. Cycle skipped.',
      note: 'Declined. This billing cycle was skipped.',
      steps,
      attempts,
      alert: { type: 'payment_skipped', title: 'Payment skipped', message: `Demo payment for ${sub.name} was declined and skipped for this cycle.` },
    };
  }
  steps.push({ label: 'Fallback "notify": you have been alerted to pay manually.', status: 'warning' });
  return {
    outcome: 'failed_notify',
    status: 'failed',
    moveDueDate: false,
    failureReason: 'Declined by the demo bank.',
    note: 'Declined. You were asked to pay manually.',
    steps,
    attempts,
    alert: { type: 'payment_failed', title: 'Payment failed', message: `Demo payment of ${amount} for ${sub.name} was declined. Please pay it manually.` },
  };
}

// Saves a notification inside the transaction unless the user turned that kind off.
function addNotification(tx, uid, profile, subscriptionId, alert) {
  if (alert.optional && profile?.preferences?.paymentAlerts === false) return null;
  const ref = col(uid, 'notifications').doc();
  const record = {
    userId: uid,
    type: alert.type,
    title: alert.title,
    message: alert.message,
    subscriptionId,
    isRead: false,
    createdAt: FieldValue.serverTimestamp(),
  };
  tx.set(ref, record);
  return { id: ref.id, ...record, createdAt: new Date().toISOString() };
}

// Callable: simulatePayment({ subscriptionId, requestId, scenario })
async function simulatePayment(request) {
  const uid = requireUser(request);
  const { subscriptionId, requestId } = checkInput(request.data);
  const scenario = request.data.scenario || 'success';
  if (!SCENARIOS.includes(scenario)) throw new HttpsError('invalid-argument', 'Unknown demo bank behaviour.');

  return getFirestore().runTransaction(async (tx) => {
    const paymentRef = col(uid, 'payments').doc(requestId);
    const subRef = col(uid, 'subscriptions').doc(subscriptionId);
    const ruleRef = col(uid, 'autopayRules').doc(subscriptionId);
    const [existing, subSnap, ruleSnap, profileSnap] = await Promise.all([
      tx.get(paymentRef),
      tx.get(subRef),
      tx.get(ruleRef),
      tx.get(userRef(uid)),
    ]);

    // The same button press (same requestId) must never create two payments.
    if (existing.exists) {
      const payment = paymentForApp(existing.id, existing.data());
      return { duplicate: true, outcome: payment.outcome, steps: payment.steps, payment, nextDueDate: subSnap.exists ? subSnap.data().nextDueDate : null };
    }
    if (!subSnap.exists) throw new HttpsError('not-found', 'Subscription not found.');
    const sub = subSnap.data();
    const rule = ruleSnap.exists ? ruleSnap.data() : null;
    if (!rule || !rule.enabled) throw new HttpsError('failed-precondition', `Auto-pay is turned off for ${sub.name}. Turn it on and save first.`);
    if (sub.status !== 'active') throw new HttpsError('failed-precondition', `${sub.name} is ${sub.status}. Only active subscriptions can be paid.`);
    if (!(sub.amount > 0) || !(rule.spendingLimit > 0)) throw new HttpsError('failed-precondition', 'Set a valid amount and spending limit first.');

    const maxAttempts = Math.min(Math.max(Number(rule.retry?.maxAttempts) || 3, 1), 5);
    const result = decide({ sub, rule, scenario, maxAttempts });
    if (result.status === 'successful') await assertNotAlreadyPaid(tx, uid, subscriptionId, sub.nextDueDate);

    const nextDueDate = result.moveDueDate ? advanceByCycle(sub.nextDueDate, sub.billingCycle) : sub.nextDueDate;
    if (result.moveDueDate) result.steps.push({ label: `Next due date moved to ${nextDueDate}.`, status: 'info' });

    const now = Timestamp.now();
    const payment = {
      userId: uid,
      subscriptionId,
      subscriptionName: sub.name, // copied so history still reads well after the subscription is deleted
      category: sub.category,
      amount: sub.amount,
      currency: sub.currency || 'INR',
      billingPeriod: sub.nextDueDate, // the bill this attempt was for
      date: now,
      type: 'automatic',
      status: result.status,
      outcome: result.outcome,
      transactionRef: result.status === 'successful' ? transactionRef(requestId) : null,
      failureReason: result.failureReason,
      method: accountLabel(rule.demoAccountId),
      demoAccountId: rule.demoAccountId || null,
      attempts: result.attempts,
      attemptCount: result.attempts.length,
      steps: result.steps,
      note: result.note,
      simulated: true,
      createdAt: now,
    };
    tx.set(paymentRef, payment);
    if (result.moveDueDate) tx.update(subRef, { nextDueDate, updatedAt: FieldValue.serverTimestamp() });
    const notification = addNotification(tx, uid, profileSnap.data(), subscriptionId, result.alert);

    return {
      duplicate: false,
      outcome: result.outcome,
      steps: result.steps,
      payment: paymentForApp(requestId, payment),
      notification,
      nextDueDate,
    };
  });
}

// Callable: recordManualPayment({ subscriptionId, requestId, demoAccountId })
// "Mark as paid": records a successful demo payment and moves the due date on.
async function recordManualPayment(request) {
  const uid = requireUser(request);
  const { subscriptionId, requestId } = checkInput(request.data);
  const demoAccountId = typeof request.data.demoAccountId === 'string' ? request.data.demoAccountId : null;

  return getFirestore().runTransaction(async (tx) => {
    const paymentRef = col(uid, 'payments').doc(requestId);
    const subRef = col(uid, 'subscriptions').doc(subscriptionId);
    const [existing, subSnap, profileSnap] = await Promise.all([tx.get(paymentRef), tx.get(subRef), tx.get(userRef(uid))]);
    if (existing.exists) {
      return { duplicate: true, payment: paymentForApp(existing.id, existing.data()), nextDueDate: subSnap.exists ? subSnap.data().nextDueDate : null };
    }
    if (!subSnap.exists) throw new HttpsError('not-found', 'Subscription not found.');
    const sub = subSnap.data();
    if (sub.status === 'cancelled') throw new HttpsError('failed-precondition', `${sub.name} is cancelled.`);
    await assertNotAlreadyPaid(tx, uid, subscriptionId, sub.nextDueDate);

    const now = Timestamp.now();
    const nextDueDate = advanceByCycle(sub.nextDueDate, sub.billingCycle);
    const payment = {
      userId: uid,
      subscriptionId,
      subscriptionName: sub.name,
      category: sub.category,
      amount: sub.amount,
      currency: sub.currency || 'INR',
      billingPeriod: sub.nextDueDate,
      date: now,
      type: 'manual',
      status: 'successful',
      outcome: 'success',
      transactionRef: transactionRef(requestId),
      failureReason: null,
      method: accountLabel(demoAccountId),
      demoAccountId,
      attempts: [{ attempt: 1, result: 'approved' }],
      attemptCount: 1,
      steps: [],
      note: 'Marked as paid (demo).',
      simulated: true,
      createdAt: now,
    };
    tx.set(paymentRef, payment);
    tx.update(subRef, { nextDueDate, updatedAt: FieldValue.serverTimestamp() });
    addNotification(tx, uid, profileSnap.data(), subscriptionId, {
      type: 'payment_success',
      title: 'Payment recorded',
      message: `Manual demo payment of ${formatINR(sub.amount)} for ${sub.name} recorded.`,
      optional: true,
    });
    return { duplicate: false, payment: paymentForApp(requestId, payment), nextDueDate };
  });
}

module.exports = { simulatePayment, recordManualPayment, decide };
