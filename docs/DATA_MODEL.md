# Firestore data model and security

All data for one person lives under their own user document:

```
users/{uid}                                  profile
users/{uid}/subscriptions/{subscriptionId}   bills and subscriptions
users/{uid}/autopayRules/{subscriptionId}    auto-pay rule (id = the subscription's id)
users/{uid}/payments/{paymentId}             simulated payments (id = the request id)
users/{uid}/notifications/{notificationId}   in-app notifications
users/{uid}/summaries/{YYYY-MM}              monthly rule-based spending summary
```

**Why subcollections under the user?** Ownership is part of the path, so the security rule "only the owner" is a single comparison (`request.auth.uid == uid`), and every query only touches one user's data. Each document still stores `userId` as the spec asked; the rules check that it matches the path.

## Documents

**users/{uid}**: `userId`, `name`, `email`, `preferences { renewalReminders, paymentAlerts, currency: "INR" }`, `createdAt`, `updatedAt`. Passwords are never stored here: Firebase Authentication keeps them.

**subscriptions/{id}**: `userId`, `name`, `category` (Entertainment, Utilities, Software, Education, Shopping, Other), `amount`, `currency` ("INR"), `billingCycle` (weekly, monthly, quarterly, yearly), `nextDueDate` ("YYYY-MM-DD"), `startDate`, `status` (active, paused, cancelled), `cancellationUrl`, `reminder { enabled, daysBefore 0-30 }`, `autopayEnabled`, `createdAt`, `updatedAt`.

**autopayRules/{subscriptionId}**: `userId`, `subscriptionId`, `enabled`, `spendingLimit` (per transaction), `failureAction` (retry, notify, skip), `retry { maxAttempts 1-5 }`, `demoAccountId` (one of three demo ids), `updatedAt`.

**payments/{requestId}**: `userId`, `subscriptionId`, `subscriptionName`, `category`, `amount`, `currency`, `billingPeriod` (the due date this bill was for), `date`, `type` (automatic, manual), `status` (successful, failed, skipped), `outcome`, `transactionRef` ("SIM-..." for successful simulated payments), `failureReason`, `method`, `demoAccountId`, `attempts[]`, `attemptCount`, `steps[]`, `note`, `simulated: true`, `createdAt`.

**notifications/{id}**: `userId`, `type`, `title`, `message`, `subscriptionId`, `isRead`, `createdAt`. Renewal reminders use the id `reminder_<subscriptionId>_<dueDate>` so the same reminder is never created twice.

**summaries/{YYYY-MM}**: `userId`, `month`, `totals { monthly, yearly, activeCount, paidThisMonth }`, `categoryBreakdown[]`, `recommendations[]`, `generator: "rule-based"`, `generatedAt`. Written when the Insights screen opens.

## Deliberate copies (denormalization)

Firestore has no joins, so a few values are copied on purpose:

- `subscriptions.autopayEnabled` copies `autopayRules.enabled`, so the bills list can show the "Auto-pay" badge without reading every rule. Both are written together in one batch.
- `payments.subscriptionName` and `payments.category` are copied from the subscription when the payment is made. The payment history still reads correctly after a subscription is renamed or deleted, and it records what the bill was called at the time.

## Dates and time

- **Due dates are calendar dates** stored as `"YYYY-MM-DD"` text, not timestamps. A bill due on 5 November is due on 5 November in any time zone, and date maths stays simple (`utils/dateMath.js`, `functions/src/dates.js`). "Today" on the server is calculated in India time (Asia/Kolkata).
- **Moments** (`createdAt`, `updatedAt`, payment `date`) are Firestore Timestamps set by the server clock (`serverTimestamp()`); the rules require `== request.time`, so a phone cannot back-date records.
- Monthly estimate: weekly × 52 ÷ 12, monthly × 1, quarterly ÷ 3, yearly ÷ 12.

## Indexes (`firestore.indexes.json`)

1. `payments`: `subscriptionId` ↑ + `date` ↓, for "recent payments" on a subscription's details screen.
2. `subscriptions` (collection group): `status` ↑ + `nextDueDate` ↑, for the daily reminder function, which searches all users' active subscriptions due soon.

Other queries use Firestore's automatic single-field indexes.

## Who can write what

| Data | App (security rules) | Cloud Functions (Admin SDK) |
| --- | --- | --- |
| Profile | Owner creates and updates name/preferences; email must match the login; no extra fields | — |
| Subscriptions | Owner creates/updates/deletes; every field validated | Moves `nextDueDate` after a payment |
| Auto-pay rules | Owner; validated; the subscription must exist | Reads them |
| Payments | **Read only** | Creates them (simulation, manual, sample) |
| Notifications | Owner may create only `welcome`, `renewal_reminder`, `autopay_updated`; may only change `isRead`; may delete | Creates payment-result and scheduled reminders |
| Summaries | Owner; `generator` must be `rule-based` | — |

Cloud Functions use the Admin SDK, which bypasses security rules, so they check ownership themselves: every function reads and writes only under `users/{the caller's uid}`, which comes from the verified login token, never from the request data.
