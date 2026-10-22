# Testing PayPilot

## Automated tests (run on your laptop)

Needs Java 21 (see README). From the project folder:

```powershell
npm run test:backend
```

It starts the Auth, Firestore and Functions emulators, runs `tests/rules.test.js` (17 security-rule tests) and `tests/functions.test.js` (15 Cloud Function tests), then stops the emulators. Expected: `# pass 32` and `# fail 0`.

Also run `npx expo lint` (expected: no output).

## Manual checklist

Run it with the emulators (`npm run emulators` + `npm run web`) or with your real project. Tick each box.

### Authentication
- [ ] Register with empty fields shows "Email is required." and other field messages
- [ ] Register a new account opens an empty dashboard with a welcome notification
- [ ] Registering the same email again shows "An account with this email already exists."
- [ ] Log out (confirm pop-up), then log in with a wrong password: "Incorrect email or password."
- [ ] Forgot password? → Send reset link → success message (real project: the email arrives; emulators: the link is printed in the emulator terminal)
- [ ] Log in, close the browser tab or the app, open it again: still logged in
- [ ] Profile → Edit → change the name → it shows on Profile

### Subscriptions (CRUD)
- [ ] Add with empty name / amount 0 / bad link: validation messages appear
- [ ] Add "Notion Plus", Software, ₹400, reminder "1 week before": it appears in Bills and the Home total goes up
- [ ] Details show category, status, reminder and auto-pay settings
- [ ] Edit the amount: same item updated, no duplicate
- [ ] Delete (confirm pop-up): it disappears and the total goes down; its payment history stays in History
- [ ] Filters (category, status) and search work

### Ownership (security)
- [ ] Create a second account in another browser (or a private window). It sees none of the first account's data
- [ ] Emulator UI → Firestore: each user's data is under their own `users/{uid}`
- [ ] Rules tests passed (`npm run test:backend`)

### Payments and auto-pay (simulation)
- [ ] Profile → Add sample data adds 10 subscriptions; Home shows ₹4,850 per month
- [ ] Netflix → Configure Auto-Pay → Bank approves → Simulate: successful; due date moves one month
- [ ] Fallback Retry + Bank declines: 3 attempts, one failed payment
- [ ] Fallback Skip + Bank declines: skipped, due date moves
- [ ] Fallback Notify + Bank declines: failed once, due date stays
- [ ] Limit ₹500 + Bank approves: "Blocked by spending limit", no attempt
- [ ] Each outcome appears in Payment History with its colour, and opens a detail screen (transaction ref, failure reason)
- [ ] Each outcome created a notification
- [ ] Details → Mark as paid → a manual payment is recorded

### Dashboard and analytics
- [ ] Home: monthly total, paid vs. still due this month, upcoming payments, 6-month chart, category split
- [ ] Insights tab: rule-based insights, category breakdown, savings scenarios
- [ ] After opening Insights, Firestore has `users/{uid}/summaries/<YYYY-MM>`

### Notifications
- [ ] Bell icon shows the unread count; tapping a notification marks it read
- [ ] Mark all read clears the count
- [ ] A subscription due within its reminder window gets a "Renewal reminder" (only once)

### Phone (Expo Go)
- [ ] `npx expo start`, scan the QR code: login, add a subscription and simulate a payment all work on the phone
- [ ] Close Expo Go completely and reopen: still logged in

## What has actually been run so far

Run on the developer's machine against the Firebase emulators (Auth, Firestore, Functions), 21 October 2026:
- `npm run test:backend`: 32 of 32 passed.
- `npx expo lint`: no problems.
- `expo export --platform android`: Android bundle built.
- Browser click-through (Playwright, 27 steps), all passed:
  - Authentication: register validation, register, wrong password, forgot password, logging in again, duplicate email.
  - Data: sample data, dashboard ₹4,850, bills filter, details.
  - Payments: auto-pay, the four payment outcomes, payment history, payment detail.
  - Screens: notifications and mark all read, insights.
  - Subscriptions: add validation, add, edit, delete.
  - Account: reload persistence, edit profile, logout.

Not run yet: a real Firebase project, deployed Cloud Functions, the scheduled reminder on its timer, and anything on a real phone.
