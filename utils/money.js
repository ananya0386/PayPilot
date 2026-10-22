// Money helpers. Amounts are rupees stored as numbers with up to 2 decimals.

export function round2(value) {
  return Math.round(value * 100) / 100;
}

// Converts any billing cycle to its average monthly cost.
export function monthlyEquivalent(amount, billingCycle) {
  if (billingCycle === 'weekly') return round2((amount * 52) / 12);
  if (billingCycle === 'quarterly') return round2(amount / 3);
  if (billingCycle === 'yearly') return round2(amount / 12);
  return round2(amount);
}
