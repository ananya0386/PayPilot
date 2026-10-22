// Date helpers for the Cloud Functions.
// Due dates are stored as plain "YYYY-MM-DD" text (a calendar date, with no
// time zone), so date maths here is simple string/calendar maths.
// "Today" is worked out in India time, because PayPilot shows amounts in ₹.
const TIME_ZONE = 'Asia/Kolkata';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function today() {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
}

function toUtc(dateString) {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = toUtc(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

// Jan 31 + 1 month -> Feb 28/29 (keeps the day sensible).
function addMonths(dateString, months) {
  const date = toUtc(dateString);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return fromUtc(date);
}

function advanceByCycle(dateString, billingCycle) {
  switch (billingCycle) {
    case 'weekly':
      return addDays(dateString, 7);
    case 'quarterly':
      return addMonths(dateString, 3);
    case 'yearly':
      return addMonths(dateString, 12);
    default:
      return addMonths(dateString, 1);
  }
}

function daysBetween(from, to) {
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}

module.exports = { TIME_ZONE, isValidDateString, today, addDays, addMonths, advanceByCycle, daysBetween };
