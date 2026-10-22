// Renewal reminders (scheduled). Runs once a day in Cloud Functions and adds
// a "renews soon" notification for every active subscription whose due date
// is within that subscription's reminder window (3 days by default).
//
// Each reminder uses a fixed document id (reminder_<subscription>_<due date>),
// so running this twice, or the app creating the same reminder, never makes
// a duplicate.
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { col, formatINR } = require('./common');
const { addDays, daysBetween, today } = require('./dates');

const MAX_WINDOW = 30;

const reminderId = (subscriptionId, dueDate) => `reminder_${subscriptionId}_${dueDate}`;

function reminderText(sub, days) {
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  const how = sub.autopayEnabled ? 'Demo auto-pay is on.' : 'Auto-pay is off, so remember to pay it.';
  return `${sub.name} (${formatINR(sub.amount)}) renews ${when}. ${how}`;
}

async function sendRenewalReminders(todayString = today()) {
  const db = getFirestore();
  const due = await db
    .collectionGroup('subscriptions')
    .where('status', '==', 'active')
    .where('nextDueDate', '>=', todayString)
    .where('nextDueDate', '<=', addDays(todayString, MAX_WINDOW))
    .get();

  const prefsCache = new Map();
  let created = 0;
  for (const doc of due.docs) {
    const sub = doc.data();
    const uid = doc.ref.parent.parent.id;
    if (sub.reminder && sub.reminder.enabled === false) continue;
    const days = daysBetween(todayString, sub.nextDueDate);
    const window = Number.isInteger(sub.reminder?.daysBefore) ? sub.reminder.daysBefore : 3;
    if (days < 0 || days > window) continue;

    if (!prefsCache.has(uid)) {
      const profile = await db.collection('users').doc(uid).get();
      prefsCache.set(uid, profile.exists ? profile.data().preferences || {} : {});
    }
    if (prefsCache.get(uid).renewalReminders === false) continue;

    try {
      await col(uid, 'notifications').doc(reminderId(doc.id, sub.nextDueDate)).create({
        userId: uid,
        type: 'renewal_reminder',
        title: 'Renewal reminder',
        message: reminderText(sub, days),
        subscriptionId: doc.id,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });
      created += 1;
    } catch (error) {
      if (error.code !== 6) throw error; // 6 = ALREADY_EXISTS: reminder was already sent
    }
  }
  return { checked: due.size, created };
}

module.exports = { sendRenewalReminders, reminderId };
