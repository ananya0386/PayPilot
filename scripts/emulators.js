// Starts the Firebase emulators and keeps their data between runs.
// On the first run there is nothing to import yet; when you stop the emulators
// with Ctrl + C, everything (accounts, subscriptions, payments...) is saved to
// the "emulator-data" folder and loaded again the next time.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const dir = path.join(__dirname, '..', 'emulator-data');
const args = [require.resolve('firebase-tools/lib/bin/firebase.js'), 'emulators:start', '--project', 'demo-paypilot', '--export-on-exit', dir];
if (fs.existsSync(path.join(dir, 'firebase-export-metadata.json'))) args.push('--import', dir);

console.log(args.includes('--import') ? 'Loading saved data from emulator-data ...' : 'No saved data yet (first run).');
console.log('Stop with Ctrl + C ONCE and wait for "Export complete"; closing the window loses the data.');
// No shell: folder names with spaces (like "Ananya Kawatra") must stay one argument.
// Slow Windows machines (antivirus scanning node_modules) can need more than the default
// 10 seconds to load the Cloud Functions, which leaves the emulator with NO functions.
const env = { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT || '120' };
const child = spawn(process.execPath, args, { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
