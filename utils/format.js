// Formatting helpers for money, dates and labels.
import { BILLING_CYCLES } from '../constants/categories';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Indian digit grouping: 1234567.5 -> "12,34,567.50"
function groupIndian(integerPart) {
  const s = String(integerPart);
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

export function formatCurrency(amount, { decimals = 'auto' } = {}) {
  const value = Number(amount) || 0;
  const negative = value < 0;
  const abs = Math.abs(value);
  const showDecimals = decimals === 'auto' ? Math.round(abs * 100) % 100 !== 0 : decimals;
  const fixed = abs.toFixed(showDecimals ? 2 : 0);
  const [intPart, decPart] = fixed.split('.');
  return `${negative ? '-' : ''}₹${groupIndian(intPart)}${decPart ? `.${decPart}` : ''}`;
}

// "YYYY-MM-DD" -> Date in local time
export function parseDate(dateString) {
  const [y, m, d] = String(dateString).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = typeof value === 'string' && value.length === 10 ? parseDate(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const h = date.getHours();
  const time = `${h % 12 || 12}:${String(date.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return `${formatDate(iso)}, ${time}`;
}

export function formatLongToday(date = new Date()) {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function monthTitle(iso) {
  const date = new Date(iso);
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDate(dateString) - today) / 86400000);
}

export function dueLabel(dateString) {
  const days = daysUntil(dateString);
  if (days < -1) return `Overdue by ${-days} days`;
  if (days === -1) return 'Overdue by 1 day';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 30) return `Due in ${days} days`;
  return `Due ${formatDate(dateString)}`;
}

export function dueTone(dateString) {
  const days = daysUntil(dateString);
  if (days < 0) return 'error';
  if (days <= 3) return 'warning';
  return 'neutral';
}

export function timeAgo(iso) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(iso);
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function cycleLabel(cycle) {
  return BILLING_CYCLES.find((c) => c.value === cycle)?.label || cycle;
}

export function cycleShort(cycle) {
  return BILLING_CYCLES.find((c) => c.value === cycle)?.short || '';
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function capitalize(text = '') {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
