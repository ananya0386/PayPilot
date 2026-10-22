// Callable: seedDemoData()
// Fills an EMPTY account with sample subscriptions, auto-pay rules, a few
// months of simulated payment history and notifications, so the dashboard
// and charts have something to show in a presentation. All of it is
// ILLUSTRATIVE DEMO DATA. It refuses to run if the account already has
// subscriptions, so it can never overwrite real entries.
const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const { accountLabel, col } = require('./common');
const { addDays, addMonths, today } = require('./dates');

const BANK = 'demo-acc-4821';
const CARD = 'demo-card-1092';
const UPI = 'demo-upi-7730';

// dueIn = days from today until the next due date.
const SAMPLES = [
  { name: 'Netflix', category: 'Entertainment', amount: 649, billingCycle: 'monthly', dueIn: 2, autopay: { spendingLimit: 1000, failureAction: 'retry', demoAccountId: CARD }, cancellationUrl: 'https://www.netflix.com/cancelplan' },
  { name: 'Spotify Premium', category: 'Entertainment', amount: 119, billingCycle: 'monthly', dueIn: 5, autopay: { spendingLimit: 200, failureAction: 'notify', demoAccountId: UPI }, cancellationUrl: 'https://www.spotify.com/account/subscription/' },
  { name: 'YouTube Premium', category: 'Entertainment', amount: 149, billingCycle: 'monthly', dueIn: 12, cancellationUrl: 'https://www.youtube.com/paid_memberships' },
  { name: 'Home Internet (Fiber)', category: 'Utilities', amount: 999, billingCycle: 'monthly', dueIn: 9, autopay: { spendingLimit: 1200, failureAction: 'retry', demoAccountId: BANK } },
  { name: 'Mobile Plan', category: 'Utilities', amount: 299, billingCycle: 'monthly', dueIn: 18, autopay: { spendingLimit: 500, failureAction: 'skip', demoAccountId: UPI } },
  { name: 'Electricity Bill', category: 'Utilities', amount: 1650, billingCycle: 'monthly', dueIn: 3, autopay: { spendingLimit: 1500, failureAction: 'notify', demoAccountId: BANK } },
  { name: 'Canva Pro', category: 'Software', amount: 499, billingCycle: 'monthly', dueIn: 21, cancellationUrl: 'https://www.canva.com/settings/billing-and-teams' },
  { name: 'Amazon Prime', category: 'Shopping', amount: 459, billingCycle: 'quarterly', dueIn: 40, autopay: { spendingLimit: 600, failureAction: 'notify', demoAccountId: CARD }, cancellationUrl: 'https://www.amazon.in/mc' },
  { name: 'Duolingo Super', category: 'Education', amount: 3996, billingCycle: 'yearly', dueIn: 150, cancellationUrl: 'https://www.duolingo.com/settings/subscription' },
  { name: 'Disney+ Hotstar', category: 'Entertainment', amount: 299, billingCycle: 'monthly', dueIn: 25, status: 'paused', cancellationUrl: 'https://www.hotstar.com/in/subscribe/my-account' },
];

// "YYYY-MM-DD" at 09:30 India time, as a Firestore Timestamp.
const at = (dateString, hour = 9) => Timestamp.fromDate(new Date(`${dateString}T${String(hour).padStart(2, '0')}:30:00+05:30`));

async function seedDemoData(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Please log in again.');
  const uid = request.auth.uid;
  const existing = await col(uid, 'subscriptions').limit(1).get();
  if (!existing.empty) {
    throw new HttpsError('failed-precondition', 'Sample data can only be added to an account with no subscriptions.');
  }

  const db = getFirestore();
  const batch = db.batch();
  const todayStr = today();
  const created = FieldValue.serverTimestamp();
  const subs = {};

  for (const s of SAMPLES) {
    const ref = col(uid, 'subscriptions').doc();
    const nextDueDate = addDays(todayStr, s.dueIn);
    const sub = {
      userId: uid,
      name: s.name,
      category: s.category,
      amount: s.amount,
      currency: 'INR',
      billingCycle: s.billingCycle,
      nextDueDate,
      startDate: addMonths(nextDueDate, -12),
      status: s.status || 'active',
      cancellationUrl: s.cancellationUrl || '',
      reminder: { enabled: true, daysBefore: 3 },
      autopayEnabled: Boolean(s.autopay),
      createdAt: created,
      updatedAt: created,
    };
    batch.set(ref, sub);
    if (s.autopay) {
      batch.set(col(uid, 'autopayRules').doc(ref.id), {
        userId: uid,
        subscriptionId: ref.id,
        enabled: true,
        spendingLimit: s.autopay.spendingLimit,
        failureAction: s.autopay.failureAction,
        retry: { maxAttempts: 3 },
        demoAccountId: s.autopay.demoAccountId,
        updatedAt: created,
      });
    }
    subs[s.name] = { id: ref.id, ...sub, autopay: s.autopay };
  }

  // Payment history: one payment per past billing date, with a few exceptions.
  const approved = [{ attempt: 1, result: 'approved' }];
  const declined = [{ attempt: 1, result: 'declined' }];
  let n = 0;
  const addPayment = (sub, dateString, extra = {}) => {
    if (dateString >= todayStr) return;
    const type = extra.type || (sub.autopay ? 'automatic' : 'manual');
    const status = extra.status || 'successful';
    const accountId = sub.autopay?.demoAccountId || CARD;
    n += 1;
    const ref = col(uid, 'payments').doc(`sample_${String(n).padStart(3, '0')}_${sub.id}`);
    batch.set(ref, {
      userId: uid,
      subscriptionId: sub.id,
      subscriptionName: sub.name,
      category: sub.category,
      amount: sub.amount,
      currency: 'INR',
      billingPeriod: extra.billingPeriod || dateString,
      date: at(dateString, extra.hour),
      type,
      status,
      outcome: status === 'successful' ? 'success' : extra.outcome || status,
      transactionRef: status === 'successful' ? `SIM-SAMPLE${String(n).padStart(4, '0')}` : null,
      failureReason: extra.failureReason || null,
      method: accountLabel(accountId),
      demoAccountId: accountId,
      attempts: extra.attempts || approved,
      attemptCount: (extra.attempts || approved).length,
      steps: [],
      note: extra.note || (type === 'automatic' ? 'Demo auto-pay (sample data).' : 'Marked as paid (sample data).'),
      simulated: true,
      createdAt: at(dateString, extra.hour),
    });
  };

  for (const sub of Object.values(subs).filter((s) => s.billingCycle === 'monthly' && s.status === 'active')) {
    for (let k = 1; k <= 5; k += 1) {
      const date = addMonths(sub.nextDueDate, -k);
      if (sub.name === 'Electricity Bill' && k === 1) {
        addPayment(sub, date, { status: 'skipped', outcome: 'limit_exceeded', attempts: [], failureReason: 'Amount is above the spending limit.', note: 'Blocked: amount is above the spending limit.' });
        addPayment(sub, addDays(date, 1), { type: 'manual', billingPeriod: date });
      } else if (sub.name === 'Spotify Premium' && k === 2) {
        addPayment(sub, date, { status: 'failed', outcome: 'failed_notify', attempts: declined, failureReason: 'Declined by the demo bank.', note: 'Declined. You were asked to pay manually.' });
        addPayment(sub, addDays(date, 1), { type: 'manual', hour: 18, billingPeriod: date });
      } else if (sub.name === 'Mobile Plan' && k === 3) {
        addPayment(sub, date, { status: 'skipped', attempts: declined, failureReason: 'Declined by the demo bank. Cycle skipped.', note: 'Declined. This billing cycle was skipped.' });
      } else if (sub.name === 'Home Internet (Fiber)' && k === 1) {
        addPayment(sub, date, { attempts: [...declined, { attempt: 2, result: 'approved' }], note: 'Succeeded on the second attempt.' });
      } else {
        addPayment(sub, date);
      }
    }
  }
  addPayment(subs['Amazon Prime'], addMonths(subs['Amazon Prime'].nextDueDate, -3));
  addPayment(subs['Duolingo Super'], addMonths(subs['Duolingo Super'].nextDueDate, -12));
  addPayment(subs['Disney+ Hotstar'], addDays(todayStr, -65), { type: 'manual' });

  const notes = [
    { type: 'payment_failed', title: 'Payment failed', sub: 'Spotify Premium', message: 'Demo payment of ₹119 for Spotify Premium was declined. Please pay it manually.', daysAgo: 55, isRead: true },
    { type: 'payment_skipped', title: 'Payment skipped', sub: 'Mobile Plan', message: 'Demo payment for Mobile Plan was declined and skipped for this cycle.', daysAgo: 74, isRead: true },
    { type: 'spending_limit', title: 'Auto-pay blocked', sub: 'Electricity Bill', message: 'Demo auto-pay for Electricity Bill was blocked: ₹1,650 is above your ₹1,500 limit.', daysAgo: 27 },
    { type: 'payment_success', title: 'Payment successful', sub: 'Home Internet (Fiber)', message: 'Demo payment of ₹999 for Home Internet (Fiber) succeeded after 2 attempts.', daysAgo: 21 },
    { type: 'payment_success', title: 'Payment successful', sub: 'Netflix', message: 'Demo payment of ₹649 for Netflix succeeded.', daysAgo: 28 },
  ];
  for (const note of notes) {
    batch.set(col(uid, 'notifications').doc(), {
      userId: uid,
      type: note.type,
      title: note.title,
      message: note.message,
      subscriptionId: subs[note.sub].id,
      isRead: Boolean(note.isRead),
      createdAt: at(addDays(todayStr, -note.daysAgo), 10),
    });
  }

  await batch.commit();
  return { subscriptions: SAMPLES.length, payments: n, notifications: notes.length };
}

module.exports = { seedDemoData };
