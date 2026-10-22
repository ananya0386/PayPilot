# PayPilot (Firebase edition)

PayPilot is a subscription and recurring-bill manager. You can track Netflix, internet, electricity and similar bills, see what you spend each month, get renewal reminders, and try a **demonstration** auto-pay.

- **App:** React Native + Expo Router (JavaScript), the same screens as before.
- **Backend:** Firebase.
  - **Firebase Authentication** handles accounts, login and password reset.
  - **Cloud Firestore** is the database.
  - **Cloud Functions** run the trusted payment simulation, reminders and sample data.

> **No real money is ever involved.** PayPilot never asks for card numbers, CVVs, UPI PINs or bank passwords and never connects to a bank or payment gateway. "Auto-pay" is a simulation with made-up demo accounts like "Demo Card •••• 1092". Insights come from simple rules, not an AI model.

More documents:
- [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md): step-by-step Firebase Console setup and deployment
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md): Firestore structure, security rules and design decisions
- [docs/TESTING.md](docs/TESTING.md): automated tests and the manual test checklist

---

## 1. Two ways to run it

| | **A. Local emulators** (recommended first) | **B. Real Firebase project** |
| --- | --- | --- |
| Firebase account needed | No | Yes (free Google account) |
| Cost | Free | Auth + Firestore are free (Spark plan). **Cloud Functions need the Blaze plan** (see section 6) |
| Data lives | On your laptop (deleted when emulators stop) | In Google's cloud |
| Everything works? | Yes, including payments and sample data | Without Functions deployed: everything except payments, "Mark as paid" and sample data |

## 2. Install the tools (once)

1. **Node.js LTS** from https://nodejs.org (includes npm). Restart VS Code afterwards.
2. **Java 21 or newer** (only for option A, the emulators need it). Download "Temurin 21 (LTS)" for Windows `.msi` from https://adoptium.net and install it with the default options. Check it in a new terminal with `java -version`.
3. **Expo Go** on your Android phone from the Play Store (optional; the browser works too).

## 3. First run in VS Code (option A: emulators, no Firebase account)

Open the `PayPilot-Firebase` folder in VS Code (**File → Open Folder**). Open a terminal (**Terminal → New Terminal**) and run:

```powershell
npm install
npm run functions:install
copy .env.example .env
```

`.env` now says `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true`.

**Terminal 1**: start the Firebase emulators (Auth, Firestore, Functions):

```powershell
npm run emulators
```

Wait until it prints **"All emulators ready!"**. Leave it running. The Emulator UI at http://localhost:4000 shows every user and document.

**Terminal 2** (click **+** in the terminal panel): start the app:

```powershell
npm run web
```

The browser opens http://localhost:8081. Then:

1. Click **Get Started** and create an account (any email works with the emulators).
2. Go to **Profile → Add sample data** to load 10 sample subscriptions with payment history.
3. Open the Emulator UI → **Firestore** to watch the documents change as you use the app.

**On your phone (Expo Go):**
1. Run `ipconfig` and copy your Wi-Fi **IPv4 Address** (for example `192.168.1.23`).
2. In `.env`, set `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=192.168.1.23`.
3. Run `npx expo start` and scan the QR code with Expo Go. Phone and laptop must be on the same Wi-Fi.
4. Allow Node.js and Java through the Windows Firewall when asked.

## 4. Using your real Firebase project (option B)

Follow **[docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)**. In short:

1. Create a Firebase project, enable **Email/Password** sign-in, create **Firestore** (location `asia-south1`).
2. Register a **Web app** and copy its config values into `.env`, and set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false`.
3. `npx firebase login`, then `npx firebase use --add` and pick your project.
4. `npm run deploy:rules` (security rules + indexes).
5. Optional (Blaze plan): `npm run deploy:functions`.
6. `npm run web` or `npx expo start`.

If `.env` is missing values, the app shows a "Firebase setup needed" screen instead of crashing.

## 5. Useful commands

| Command | What it does |
| --- | --- |
| `npm run web` | Run the app in the browser |
| `npx expo start` | Run the app for Expo Go (QR code) |
| `npm run emulators` | Start the local Auth, Firestore and Functions emulators |
| `npm run test:backend` | Run the 32 automated security-rule and Cloud Function tests (uses the emulators, Java needed) |
| `npx expo lint` | Code-style check |
| `npm run deploy:rules` | Upload `firestore.rules` and `firestore.indexes.json` to your project |
| `npm run deploy:functions` | Upload the Cloud Functions (Blaze plan) |

If PowerShell says "running scripts is disabled", run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, answer **Y**, and try again.

## 6. What is free and what may cost money

- **Free (Spark plan):** Firebase Authentication with email/password, Cloud Firestore within the daily free quota (about 50,000 reads and 20,000 writes per day, 1 GiB stored), and deploying security rules and indexes. A college project stays far below these limits.
- **Needs the Blaze (pay-as-you-go) plan:** deploying **Cloud Functions**. Blaze needs a billing card, but it includes a monthly free allowance (millions of function calls) that a student project will not use up. Deploying also stores the function's build image in Google Cloud (Artifact Registry/Cloud Build), which can cost a few cents if it grows; when `firebase deploy` asks about a cleanup policy, answer **Yes**. The scheduled reminder uses **Cloud Scheduler** (3 jobs per billing account are free; PayPilot uses 1).
- **Protect yourself:** in Google Cloud Console → Billing → **Budgets & alerts**, create a budget of ₹100 with email alerts. Functions are also capped at 5 instances in `functions/index.js`.
- **Free alternative:** the local emulators (option A) run all of it, Functions included, at no cost.

## 7. Project structure

```
app/                     Screens (Expo Router: each file is a screen)
  (tabs)/                Home, Bills, Add, Insights, Profile
  login.js, register.js, forgot-password.js, edit-profile.js, notifications.js
  subscription/[id]/     Details, edit, auto-pay settings + simulation
  payments/              Payment history and payment details
components/              Reusable UI pieces (unchanged design)
context/AuthContext.js   Login state from Firebase (onAuthStateChanged)
services/
  firebase.js            THE single Firebase setup file (reads .env, connects emulators)
  authPersistence*.js    Keeps you logged in (AsyncStorage on phones, browser storage on web)
  store.js               Every data operation the screens use (Auth, Firestore, Functions calls)
  errors.js              Turns Firebase error codes into friendly messages
  insights.js            Rule-based spending insights (no AI)
functions/               Cloud Functions (Node.js 22)
  index.js               Function list and region (asia-south1, Mumbai)
  src/payments.js        Demo payment simulation and "mark as paid"
  src/reminders.js       Daily renewal reminders
  src/seed.js            Sample data for an empty account
firestore.rules          Security rules (who may read/write what)
firestore.indexes.json   Composite indexes the queries need
firebase.json            Firebase CLI + emulator settings
tests/                   Automated rules and Cloud Function tests
docs/                    Setup guide, data model, test checklist
```

## 8. How the pieces fit (short version)

1. **Logging in:** `context/AuthContext.js` listens to Firebase Authentication. Firebase stores the password securely; PayPilot never sees or saves it. The login is remembered on the device.
2. **Reading and saving data:** screens call `store.subscriptions.list()` and similar functions in `services/store.js`, which read and write Firestore documents under `users/{your uid}/...`.
3. **Security:** `firestore.rules` lets a signed-in user touch only documents under their own `users/{uid}` path, and checks every field (names, amounts, dates, categories). Hiding buttons is not the protection; the rules are.
4. **Payments:** the app cannot write payment records at all. Pressing **Simulate Payment** calls the `simulatePayment` Cloud Function, which checks the spending limit, runs the pretend bank, applies retry/notify/skip, saves the payment, moves the due date and adds a notification in **one transaction**.
5. **Duplicate protection:** each button press gets a unique request id that becomes the payment's document id, so the same press can never save two payments. A second successful payment for the same bill date is also refused.
6. **Monthly totals:** amounts are converted to a monthly estimate: weekly × 52 ÷ 12, monthly as is, quarterly ÷ 3, yearly ÷ 12 (`utils/money.js`). Only active subscriptions count.

## 9. Feature status

"Tested" means the test was actually run against the local Firebase emulators. Nothing has been tested against a real Firebase project or on a real phone, because those need your Firebase account and device.

| Feature | Status | Evidence / note |
| --- | --- | --- |
| Register, login, logout, wrong-password message | Implemented, tested | Browser click-through on emulators |
| Login remembered after reload | Implemented, tested (web) | Browser reload on emulators; phone persistence (AsyncStorage) bundled but not run on a phone |
| Password reset email | Implemented, tested (emulator) | Emulator printed the reset link; real email delivery needs a real project |
| Duplicate email rejected | Implemented, tested | Browser click-through |
| Profile view and name update | Implemented, tested | Browser click-through |
| Subscriptions add / view / edit / delete, categories, filters | Implemented, tested | Browser click-through + rules tests |
| Input validation (form, store, security rules) | Implemented, tested | Rules tests reject bad amounts, dates, categories, URLs, extra fields |
| Reminder settings per subscription | Implemented, tested | Add-form chips and details screen |
| Auto-pay rules (limit, retry/notify/skip, demo account) | Implemented, tested | Browser + function tests |
| Payment simulation: success, limit blocked, retry, skip, notify | Implemented, tested | 7 Cloud Function tests + browser click-through |
| Duplicate payment prevention | Implemented, tested | Same request sent 5 times → 1 payment; already-paid bill refused |
| "Mark as paid" (manual demo payment) | Implemented, tested | Function test |
| Payment history and details | Implemented, tested | Browser click-through |
| Notifications, unread count, mark read / all read | Implemented, tested | Browser click-through + rules tests |
| Renewal reminders when the app opens | Implemented, tested | Created on dashboard load in the click-through |
| Daily scheduled reminders (Cloud Function) | Implemented, logic tested; **awaiting deployment** | Reminder code tested against the emulator; the schedule itself only runs after deploying on Blaze |
| Dashboard totals, upcoming renewals, category split, 6-month trend | Implemented, tested | Showed ₹4,850 with sample data |
| Rule-based insights and monthly summary saved to Firestore | Implemented, tested | Insights screen; summary write covered by rules tests |
| Ownership (users cannot see or change others' data) | Implemented, tested | Rules tests + function test with a second user |
| Sample data for an empty account | Implemented, tested | Function test + click-through |
| Firebase setup screen when `.env` is missing | Implemented, tested | Browser |
| Android bundle builds | Tested | `expo export --platform android` succeeded |
| Real Firebase project (Spark) | **Awaiting your configuration** | Follow docs/FIREBASE_SETUP.md |
| Cloud Functions on real Firebase | **Awaiting your configuration** (Blaze plan) | `npm run deploy:functions` |
| Running on a real phone with Expo Go | **Not tested yet** | Please try and report |
| Push notifications (Firebase Cloud Messaging) | **Not implemented** | Remote push does not work inside Expo Go; it needs a development build. In-app notifications are used instead |
