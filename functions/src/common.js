// Shared values for the Cloud Functions.
const { getFirestore } = require('firebase-admin/firestore');

// Pretend payment accounts used by the simulation. They are labels only:
// PayPilot never stores or asks for real card, bank or UPI details.
const DEMO_ACCOUNTS = [
  { id: 'demo-acc-4821', label: 'Demo Account •••• 4821' },
  { id: 'demo-card-1092', label: 'Demo Card •••• 1092' },
  { id: 'demo-upi-7730', label: 'Demo UPI •••• 7730' },
];

const accountLabel = (id) => (DEMO_ACCOUNTS.find((a) => a.id === id) || {}).label || 'Demo account';

function groupIndian(intPart) {
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

// 1650 -> "₹1,650", 1650.5 -> "₹1,650.50"
function formatINR(amount) {
  const value = Math.abs(Number(amount) || 0);
  const fixed = value.toFixed(Math.round(value * 100) % 100 !== 0 ? 2 : 0);
  const [intPart, decPart] = fixed.split('.');
  return `₹${groupIndian(intPart)}${decPart ? `.${decPart}` : ''}`;
}

// Every user's data lives under users/{uid}/..., so ownership is simply the path.
const userRef = (uid) => getFirestore().collection('users').doc(uid);
const col = (uid, name) => userRef(uid).collection(name);

module.exports = { DEMO_ACCOUNTS, accountLabel, formatINR, userRef, col };
