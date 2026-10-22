# Firebase setup (step by step, Windows + VS Code)

Do these steps once. They use your own Google account; nothing has been created for you. Console menu names can move slightly over time; look for the same words.

## What you must set up yourself

1. Create the Firebase project (step 1).
2. Enable Email/Password sign-in (step 2).
3. Create the Firestore database (step 3).
4. Register a Web app and fill in `.env` (step 4).
5. Log in with the Firebase CLI and pick the project (step 5).
6. Deploy security rules and indexes (step 6).
7. Optional: upgrade to Blaze and deploy Cloud Functions (step 7).

## 1. Create the project

1. Go to https://console.firebase.google.com and sign in with your Google account.
2. Click **Create a project** (or **Add project**).
3. Name it, for example `paypilot`. Firebase shows a **project ID** under the name, such as `paypilot-1a2b3`. Write it down.
4. Google Analytics is not needed: turn it off and click **Create project**.

## 2. Turn on Email/Password login

1. Left menu → **Build → Authentication** → **Get started**.
2. **Sign-in method** tab → **Email/Password** → switch **Enable** on (leave "Email link" off) → **Save**.
3. Optional: **Templates** tab → **Password reset** lets you change the reset email text.

## 3. Create the Firestore database

1. Left menu → **Build → Firestore Database** → **Create database**.
2. Choose the **Standard** edition if asked.
3. **Location:** `asia-south1 (Mumbai)`. This cannot be changed later.
4. Choose **Start in production mode** (everything locked). PayPilot's own rules replace these in step 6.

## 4. Register the app and fill in `.env`

1. Click the gear icon → **Project settings** → **General** tab.
2. Under **Your apps**, click the **Web** icon `</>`. (Expo uses the Firebase JavaScript SDK, so the Web config is the right one for Android, iOS and web.)
3. Nickname `PayPilot`, leave Hosting unticked, click **Register app**.
4. You will see `const firebaseConfig = { apiKey: "...", authDomain: "...", ... }`.
5. In VS Code, copy `.env.example` to `.env` (`copy .env.example .env`) if you have not already, then fill it in:

```
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false
EXPO_PUBLIC_FIREBASE_API_KEY=<apiKey>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<authDomain>
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<projectId>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<storageBucket>
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<messagingSenderId>
EXPO_PUBLIC_FIREBASE_APP_ID=<appId>
EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION=asia-south1
```

6. Save, then restart Expo (Ctrl + C, then `npm run web` or `npx expo start`).

These values identify your project; they are not passwords, and every Firebase app ships them. The security rules protect the data. **Never** download a "service account" private key into this project: the app does not need one, and the Cloud Functions get their access from Google automatically.

## 5. Connect the Firebase CLI

The CLI (`firebase-tools`) is installed in the project by `npm install`, so prefix commands with `npx`.

```powershell
npx firebase login
npx firebase use --add
```

`login` opens the browser; allow access. `use --add` lists your projects: pick yours and type `default` as the alias. This updates `.firebaserc` (it starts with the local-only `demo-paypilot`).

## 6. Deploy the security rules and indexes (free)

```powershell
npm run deploy:rules
```

Expected ending: `Deploy complete!`. Check in the Console: **Firestore Database → Rules** shows PayPilot's rules, and **Indexes** shows two composite indexes (they can take a few minutes to finish "Building").

Now run the app with `npm run web`, register, and add a subscription. In **Firestore Database → Data** you should see `users → <your uid> → subscriptions`. That confirms the Firebase connection.

Without step 7, these features show "The payment service could not be reached": Simulate Payment, Mark as paid, and Add sample data. Everything else works.

## 7. Cloud Functions (Blaze plan)

Cloud Functions can only be deployed on the **Blaze (pay-as-you-go)** plan. It needs a billing card, but includes a monthly free allowance that a student project will not use up. Read section 6 of the README first.

1. Console → bottom-left **Upgrade** (or **Usage and billing → Details & settings → Modify plan**) → **Blaze** → follow the steps.
2. Create a budget alert: Google Cloud Console → **Billing → Budgets & alerts → Create budget**, for example ₹100 with email alerts at 50%, 90% and 100%.
3. Deploy:

```powershell
npm run functions:install
npm run deploy:functions
```

The first deploy enables some Google APIs automatically (Cloud Functions, Cloud Build, Artifact Registry, Cloud Run, Cloud Scheduler, Eventarc) and can take 3 to 5 minutes. If it asks **"How many days do you want to keep container images before they're deleted?"**, answer `1`. If it fails right after enabling APIs, wait a minute and run it again.

4. Check it: Console → **Functions** lists `simulatePayment`, `recordManualPayment`, `seedDemoData` and `renewalReminders` in `asia-south1`. In the app, **Profile → Add sample data** should add 10 subscriptions, and **Configure Auto-Pay → Simulate Payment** should show the step-by-step result.
5. The daily reminder runs at 09:00 India time. To confirm it after the next 09:00: Console → **Functions → renewalReminders → Logs** shows "Renewal reminders: checked N, created M". Until it has run, treat background reminders as untested. Reminders are also created when the app opens, so you do not have to wait.

## Troubleshooting

| Message | Fix |
| --- | --- |
| "Firebase setup needed" screen | `.env` is missing values or still has the placeholders. Fill it in and restart Expo |
| "Email/password sign-in is not enabled" | Step 2 |
| "You do not have permission... (security rules)" | Rules are not deployed (step 6), or the data being saved is invalid |
| "The payment service could not be reached" | Functions are not deployed (step 7), or with emulators: `npm run emulators` is not running |
| Firestore error about an index, with a link | Click the link once (creates the index), or run `npm run deploy:rules` |
| `auth/network-request-failed` with emulators on a phone | `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` must be the laptop's IPv4 address, same Wi-Fi, firewall allowed |
| Emulators: "Java version before 21" | Install Temurin 21 and open a new terminal |
