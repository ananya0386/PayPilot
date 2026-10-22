// Display information for subscription categories, billing cycles and
// payment/notification types. These are the only allowed values.
import { colors } from './theme';

export const CATEGORIES = ['Entertainment', 'Utilities', 'Software', 'Education', 'Shopping', 'Other'];

export const CATEGORY_META = {
  Entertainment: { icon: 'film-outline', color: '#8B5CF6' },
  Utilities: { icon: 'flash-outline', color: '#F59E0B' },
  Software: { icon: 'code-slash-outline', color: '#3B82F6' },
  Education: { icon: 'school-outline', color: '#10B981' },
  Shopping: { icon: 'bag-handle-outline', color: '#EC4899' },
  Other: { icon: 'apps-outline', color: '#64748B' },
};

export const BILLING_CYCLES = [
  { value: 'weekly', label: 'Weekly', short: '/wk' },
  { value: 'monthly', label: 'Monthly', short: '/mo' },
  { value: 'quarterly', label: 'Quarterly', short: '/qtr' },
  { value: 'yearly', label: 'Yearly', short: '/yr' },
];

export const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const FALLBACK_ACTIONS = [
  { value: 'retry', label: 'Retry', icon: 'refresh-outline', description: 'Try again, up to 3 attempts in total.' },
  { value: 'notify', label: 'Notify', icon: 'notifications-outline', description: 'Stop and alert me to pay manually.' },
  { value: 'skip', label: 'Skip', icon: 'play-skip-forward-outline', description: 'Skip this billing cycle and move on.' },
];

// Demo bank behaviour for the simulation (passed to store.subscriptions.simulate as "scenario").
export const SIMULATION_SCENARIOS = [
  { value: 'success', label: 'Bank approves' },
  { value: 'decline', label: 'Bank declines' },
  { value: 'recover', label: 'Declines once' },
];

export const PAYMENT_STATUS_META = {
  successful: { label: 'Successful', color: colors.success, soft: colors.successSoft, icon: 'checkmark-circle' },
  failed: { label: 'Failed', color: colors.error, soft: colors.errorSoft, icon: 'close-circle' },
  skipped: { label: 'Skipped', color: colors.warning, soft: colors.warningSoft, icon: 'remove-circle' },
};

export const SUBSCRIPTION_STATUS_META = {
  active: { label: 'Active', color: colors.success, soft: colors.successSoft },
  paused: { label: 'Paused', color: colors.warning, soft: colors.warningSoft },
  cancelled: { label: 'Cancelled', color: colors.textSecondary, soft: colors.divider },
};

export const NOTIFICATION_META = {
  renewal_reminder: { icon: 'calendar-outline', color: colors.info, soft: colors.infoSoft, label: 'Renewal reminder' },
  payment_success: { icon: 'checkmark-circle-outline', color: colors.success, soft: colors.successSoft, label: 'Payment successful' },
  payment_failed: { icon: 'alert-circle-outline', color: colors.error, soft: colors.errorSoft, label: 'Payment failed' },
  payment_skipped: { icon: 'play-skip-forward-outline', color: colors.warning, soft: colors.warningSoft, label: 'Payment skipped' },
  spending_limit: { icon: 'shield-outline', color: colors.warning, soft: colors.warningSoft, label: 'Spending limit' },
  autopay_updated: { icon: 'repeat-outline', color: colors.primary, soft: colors.primarySoft, label: 'Auto-pay' },
  insight: { icon: 'sparkles-outline', color: '#7C3AED', soft: '#EDE9FE', label: 'Insight' },
  welcome: { icon: 'hand-left-outline', color: colors.primary, soft: colors.primarySoft, label: 'Welcome' },
};

// Brand colours for well-known services, used by <ServiceIcon>. Anything not
// listed falls back to its category colour.
export const BRAND_COLORS = {
  netflix: '#E50914',
  spotify: '#1DB954',
  youtube: '#FF0000',
  amazon: '#FF9900',
  disney: '#113CCF',
  hotstar: '#113CCF',
  canva: '#00C4CC',
  duolingo: '#58CC02',
  adobe: '#FA0F00',
  microsoft: '#0078D4',
  google: '#4285F4',
  apple: '#111827',
  notion: '#111827',
  coursera: '#0056D2',
};

// DEMO payment accounts. They are fake: PayPilot never asks for real bank
// details, card numbers, CVVs or banking passwords.
export const DEMO_ACCOUNTS = [
  { id: 'demo-acc-4821', label: 'Demo Account •••• 4821', kind: 'bank', provider: 'PayPilot Demo Bank' },
  { id: 'demo-card-1092', label: 'Demo Card •••• 1092', kind: 'card', provider: 'PayPilot Demo Visa' },
  { id: 'demo-upi-7730', label: 'Demo UPI •••• 7730', kind: 'upi', provider: 'PayPilot Demo UPI' },
];

export const DEMO_ACCOUNT_LABELS = Object.fromEntries(DEMO_ACCOUNTS.map((a) => [a.id, a.label]));
