/**
 * One-off FCM send script using Firebase service account.
 *
 * Usage:
 *   node scripts/send_fcm_test.js --token <FCM_DEVICE_TOKEN> [--title "Diag Test"] [--body "FCM direct send"]
 *   
 * Service account options (choose ONE):
 *   1) Set GOOGLE_APPLICATION_CREDENTIALS to path of serviceAccount.json
 *   2) Set FIREBASE_SERVICE_ACCOUNT_JSON env var to the JSON string
 *
 * Examples:
 *   set GOOGLE_APPLICATION_CREDENTIALS=d:\\raksha-ireland\\backend\\serviceAccount.json
 *   node scripts/send_fcm_test.js --token ABC... --title "Diag Test" --body "Hello from script"
 *
 *   set FIREBASE_SERVICE_ACCOUNT_JSON=(contents of JSON)
 *   node scripts/send_fcm_test.js --token ABC...
 */

const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--token') out.token = args[++i];
    else if (a === '--title') out.title = args[++i];
    else if (a === '--body') out.body = args[++i];
    else if (a === '--data') {
      try { out.data = JSON.parse(args[++i]); } catch { out.data = {}; }
    }
  }
  return out;
}

function getServiceAccountFromEnv() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  try {
    // PRIVATE_KEY may contain \n that need to be preserved
    const parsed = JSON.parse(json);
    if (parsed.private_key && typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
    return null;
  }
}

function initFirebase() {
  // Option A: Inline JSON in env var
  const svc = getServiceAccountFromEnv();
  if (svc) {
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    return 'env-json';
  }

  // Option B: GOOGLE_APPLICATION_CREDENTIALS pointing to file
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (gac) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    return 'gac-file';
  }

  throw new Error('No service account configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.');
}

async function main() {
  const { token, title = 'Diagnostics Test', body = 'FCM direct send', data = { type: 'diagnostic_test' } } = parseArgs();

  if (!token) {
    console.error('Missing required --token <FCM_DEVICE_TOKEN>');
    process.exit(2);
  }

  const mode = initFirebase();
  console.log(`Firebase initialized via: ${mode}`);

  const message = {
    token,
    notification: { title, body },
    android: { priority: 'high' },
    apns: { headers: { 'apns-priority': '10' } },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [String(k), String(v)])),
  };

  try {
    const res = await admin.messaging().send(message);
    console.log('FCM send OK:', res);
    process.exit(0);
  } catch (e) {
    console.error('FCM send ERR:', e.message);
    // Surface specific hints
    if (/InvalidRegistration|MismatchSenderId|NotRegistered|Unauthorized/.test(e.message)) {
      console.error('Hint: Check the device token and Firebase project credentials match the app build.');
    }
    process.exit(1);
  }
}

main();
