// Local insight engine (FR-4).
//
// This is NOT a real AI. It is a small set of deterministic rules that look at
// the user's stored subscriptions and payments and produce plain-language
// observations. Every message is backed by numbers it can show, and savings
// are presented only as "what if you cancelled X" scenarios, never promises.
import { addDays, daysUntil, parseDateString, today } from '../utils/dateMath';
import { formatCurrency as formatINR } from '../utils/format';
import { monthlyEquivalent, round2 } from '../utils/money';

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const countWord = (n) => NUMBER_WORDS[n] || String(n);
const listNames = (items) =>
  items.length <= 2
    ? items.map((s) => s.name).join(' and ')
    : `${items
        .slice(0, -1)
        .map((s) => s.name)
        .join(', ')} and ${items[items.length - 1].name}`;

// Categories that are usually essential, so we do not suggest cancelling them.
const ESSENTIAL_CATEGORIES = ['Utilities'];

function categoryTotals(activeSubs) {
  const totals = {};
  for (const sub of activeSubs) {
    const key = sub.category;
    totals[key] = totals[key] || { category: key, monthly: 0, count: 0 };
    totals[key].monthly = round2(totals[key].monthly + monthlyEquivalent(sub.amount, sub.billingCycle));
    totals[key].count += 1;
  }
  const grand = Object.values(totals).reduce((sum, t) => sum + t.monthly, 0);
  return Object.values(totals)
    .map((t) => ({ ...t, percentage: grand > 0 ? Math.round((t.monthly / grand) * 100) : 0 }))
    .sort((a, b) => b.monthly - a.monthly);
}

function dueWithin(activeSubs, days) {
  return activeSubs
    .filter((s) => {
      const d = daysUntil(s.nextDueDate);
      return d >= 0 && d <= days;
    })
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
}

// Hypothetical savings: for categories where the user pays for 2+ services
// (excluding essentials), show what cancelling each one would save.
function savingsScenarios(activeSubs) {
  const byCategory = {};
  for (const sub of activeSubs) {
    if (ESSENTIAL_CATEGORIES.includes(sub.category)) continue;
    (byCategory[sub.category] = byCategory[sub.category] || []).push(sub);
  }
  const scenarios = [];
  for (const [category, subs] of Object.entries(byCategory)) {
    if (subs.length < 2) continue;
    for (const sub of subs) {
      const monthly = monthlyEquivalent(sub.amount, sub.billingCycle);
      scenarios.push({
        subscriptionId: sub.id,
        name: sub.name,
        category,
        reason: `One of ${subs.length} ${category} subscriptions you pay for.`,
        monthlySaving: monthly,
        yearlySaving: round2(monthly * 12),
      });
    }
  }
  scenarios.sort((a, b) => b.yearlySaving - a.yearlySaving);
  return {
    scenarios,
    note:
      'Hypothetical scenarios only: each figure is what you would stop paying if you cancelled that one subscription. ' +
      'Utilities are excluded because they are usually essential. Actual savings depend on your choices and provider terms.',
  };
}

function generateInsights(subs, payments) {
  const active = subs.filter((s) => s.status === 'active');
  const insights = [];

  if (active.length === 0) {
    insights.push({
      id: 'empty',
      severity: 'info',
      title: 'Start tracking',
      message: 'Add your subscriptions and bills to see spending insights here.',
    });
    return insights;
  }

  const totals = categoryTotals(active);
  const monthlyTotal = round2(totals.reduce((sum, t) => sum + t.monthly, 0));

  // Rule 1: one category dominates spending.
  const top = totals[0];
  if (totals.length > 1 && top.percentage >= 35) {
    insights.push({
      id: 'top-category',
      severity: 'info',
      title: `${top.category} leads your spending`,
      message: `Your ${top.category.toLowerCase()} subscriptions account for ${top.percentage}% (${formatINR(top.monthly)}/month) of your recurring spending.`,
    });
  }

  // Rule 2: renewals in the next 7 days.
  const soon = dueWithin(active, 7);
  if (soon.length > 0) {
    const sum = round2(soon.reduce((s, x) => s + x.amount, 0));
    insights.push({
      id: 'due-soon',
      severity: 'warning',
      title: 'Renewals this week',
      message: `${countWord(soon.length)} subscription${soon.length > 1 ? 's renew' : ' renews'} in the next seven days: ${listNames(soon)} (${formatINR(sum)} total).`,
    });
  }

  // Rule 3: several services in one non-essential category.
  for (const t of totals) {
    if (t.count >= 3 && !ESSENTIAL_CATEGORIES.includes(t.category)) {
      insights.push({
        id: `overlap-${t.category}`,
        severity: 'info',
        title: 'Possible overlap',
        message: `You pay for ${t.count} ${t.category.toLowerCase()} subscriptions (${formatINR(t.monthly)}/month). Review whether you still use all of them.`,
      });
    }
  }

  // Rule 4: auto-pay limits that will block the next payment.
  const blocked = active.filter((s) => s.autoPayEnabled && s.spendingLimit !== null && s.amount > s.spendingLimit);
  for (const s of blocked) {
    insights.push({
      id: `limit-${s.id}`,
      severity: 'warning',
      title: 'Auto-pay limit too low',
      message: `Demo auto-pay for ${s.name} will be blocked: ${formatINR(s.amount)} is above its ${formatINR(s.spendingLimit)} limit.`,
    });
  }

  // Rule 5: recent failed payments.
  const since = parseDateString(addDays(today(), -30)).getTime();
  const failed = payments.filter((p) => p.status === 'failed' && Date.parse(p.date) >= since);
  if (failed.length > 0) {
    insights.push({
      id: 'failed-payments',
      severity: 'error',
      title: 'Failed payments',
      message: `${countWord(failed.length)} demo payment${failed.length > 1 ? 's' : ''} failed in the last 30 days. Check the auto-pay settings for ${listNames(failed.map((p) => ({ name: p.subscriptionName })).filter((v, i, a) => a.findIndex((x) => x.name === v.name) === i))}.`,
    });
  }

  // Rule 6: paused subscriptions.
  const paused = subs.filter((s) => s.status === 'paused');
  if (paused.length > 0) {
    insights.push({
      id: 'paused',
      severity: 'info',
      title: 'Review paused subscriptions',
      message: `${listNames(paused)} ${paused.length > 1 ? 'are' : 'is'} paused. If you no longer use ${paused.length > 1 ? 'them' : 'it'}, consider cancelling from the official page.`,
    });
  }

  // Rule 7: due soon without auto-pay.
  const manualSoon = soon.filter((s) => !s.autoPayEnabled);
  if (manualSoon.length > 0) {
    insights.push({
      id: 'manual-due',
      severity: 'warning',
      title: 'Manual payments due',
      message: `${listNames(manualSoon)} ${manualSoon.length > 1 ? 'are' : 'is'} due soon and auto-pay is off. Remember to pay or enable demo auto-pay.`,
    });
  }

  // Rule 8: yearly picture.
  insights.push({
    id: 'yearly',
    severity: 'info',
    title: 'Your yearly picture',
    message: `Your ${active.length} active subscriptions and bills add up to about ${formatINR(round2(monthlyTotal * 12))} per year.`,
  });

  return insights;
}

export { generateInsights, categoryTotals, dueWithin, savingsScenarios };
