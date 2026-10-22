
// Date maths for due dates. Due dates are stored as plain "YYYY-MM-DD" text.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateString(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function today() {
  return toDateString(new Date());
}

function addDays(dateString, days) {
  const date = parseDateString(dateString);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

// Adds months while keeping the day sensible (Jan 31 + 1 month -> Feb 28/29).
function addMonths(dateString, months) {
  const date = parseDateString(dateString);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toDateString(date);
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

// Whole days from today until the given date (negative = overdue).
function daysUntil(dateString) {
  const ms = parseDateString(dateString) - parseDateString(today());
  return Math.round(ms / 86400000);
}

export {
  isValidDateString,
  toDateString,
  parseDateString,
  today,
  addDays,
  addMonths,
  advanceByCycle,
  daysUntil,
};

export function addDaysToToday(days) {
  return addDays(today(), days);
}
