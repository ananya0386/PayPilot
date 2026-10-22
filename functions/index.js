// PayPilot Cloud Functions (server-side logic that the app must not be able to fake).
//
//   simulatePayment     - callable: runs the DEMO auto-pay simulation and saves the result
//   recordManualPayment - callable: "Mark as paid" (demo) for one bill
//   seedDemoData        - callable: fills an empty account with sample data
//   renewalReminders    - scheduled: once a day, adds "renews soon" notifications
//
// No real payment, bank, card or UPI connection exists anywhere in PayPilot.
const { initializeApp } = require('firebase-admin/app');
const { setGlobalOptions } = require('firebase-functions/v2');
const { onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { simulatePayment, recordManualPayment } = require('./src/payments');
const { seedDemoData } = require('./src/seed');
const { sendRenewalReminders } = require('./src/reminders');
const { TIME_ZONE } = require('./src/dates');

initializeApp();

// Mumbai region, and at most a few instances so a mistake can't run up costs.
setGlobalOptions({ region: 'asia-south1', maxInstances: 5 });

exports.simulatePayment = onCall(simulatePayment);
exports.recordManualPayment = onCall(recordManualPayment);
exports.seedDemoData = onCall(seedDemoData);

exports.renewalReminders = onSchedule({ schedule: 'every day 09:00', timeZone: TIME_ZONE }, async () => {
  const result = await sendRenewalReminders();
  console.log(`Renewal reminders: checked ${result.checked}, created ${result.created}.`);
});
