# 🔥 Firebase Admin SDK Setup Instructions

## Problem Identified

**Root Cause**: Firebase Admin SDK is **NOT initialized** due to invalid credentials in `.env` file.

Error: `Failed to parse private key: Error: Invalid PEM formatted message`

**Impact**: 
- FCM notifications cannot be sent
- Emergency alerts created but no push notifications delivered
- Backend health shows FCM as blank/unavailable

---

## Solution: Add Real Firebase Credentials

### Step 1: Get Your Firebase Service Account

1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select your project: **raksha-ireland-app**
3. Click the **gear icon** ⚙️ → **Project Settings**
4. Go to the **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file (e.g., `raksha-ireland-app-firebase-adminsdk-xxxxx.json`)

### Step 2: Extract Values from the JSON

The downloaded JSON looks like this:

```json
{
  "type": "service_account",
  "project_id": "raksha-ireland-app",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@raksha-ireland-app.iam.gserviceaccount.com",
  "client_id": "123456789",
  ...
}
```

### Step 3: Update `.env` File

Open `d:\raksha-ireland\backend\.env` and replace these lines:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=raksha-ireland-app
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@raksha-ireland-app.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

With values from your JSON:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=<copy project_id from JSON>
FIREBASE_CLIENT_EMAIL=<copy client_email from JSON>
FIREBASE_PRIVATE_KEY="<copy entire private_key from JSON - keep quotes and \n>"
```

**IMPORTANT**: 
- Keep the `\n` characters in the private key (they represent newlines)
- Wrap the entire private_key value in double quotes
- The key should start with `"-----BEGIN PRIVATE KEY-----\n` and end with `\n-----END PRIVATE KEY-----\n"`

Example (with fake key):
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4hnRIHKYcuEBrP1kBLrBFUmNVbGP6WH8tFHBmATaVblNDJaHDp4d\n...\n-----END PRIVATE KEY-----\n"
```

### Step 4: Restart Backend Server

After updating `.env`:

```powershell
# Stop current server
Get-Process -Name node | Stop-Process -Force

# Start server again
cd "d:\raksha-ireland\backend"
node src/server.js
```

Look for this success message:
```
✅ Firebase Admin SDK initialized successfully
```

### Step 5: Verify Firebase is Working

```powershell
cd "d:\raksha-ireland\backend"
node -e "require('dotenv').config(); const admin=require('./src/config/firebase'); console.log('Firebase App:', admin.apps.length > 0 ? 'Initialized' : 'NOT initialized'); if(admin.apps.length > 0) { try { admin.messaging(); console.log('FCM: Ready'); } catch(e) { console.log('FCM Error:', e.message); } }"
```

Expected output:
```
✅ Firebase Admin SDK initialized successfully
Firebase App: Initialized
FCM: Ready
```

### Step 6: Test FCM Notification

Once Firebase is initialized, run the test script:

```powershell
cd "d:\raksha-ireland\backend"
node scripts/send_fcm_test.js --token "ey5zbL8yS0m1uMRoZ1hv_F:APA91bFDTrpSl_ZYvGXbLjODLZgc6GCAPBRD1IRROW7i7GiMbiJcH_YzyJoznycpgXiDQ15QIplRfhuGpeBrHsjqqP3RxCUR6hDCXhw0itFzEFEKmZy5cGQ" --title "Diag Test" --body "FCM is working!"
```

Expected output:
```
Firebase initialized via: env-json
FCM send OK: projects/raksha-ireland-app/messages/1234567890
```

The device with that token should receive the notification!

---

## Alternative: Use Service Account File (Optional)

If you prefer using a file instead of env vars:

1. Save the downloaded JSON as `d:\raksha-ireland\backend\serviceAccount.json`
2. Update `backend/src/config/firebase.js`:

```javascript
const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  try {
    const serviceAccount = require(path.join(__dirname, '../../serviceAccount.json'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization error:', error.message);
  }
}

module.exports = admin;
```

3. Restart the server

---

## Troubleshooting

### "MismatchSenderId" Error
- The Firebase project doesn't match the `google-services.json` in your Android app
- Ensure the Android app was built with the correct Firebase project
- Re-download `google-services.json` and rebuild the APK if needed

### "InvalidRegistration" Error
- FCM token is expired or invalid
- Open the app to refresh the token
- Check the database for updated `fcm_token` value

### "Unauthorized" Error
- Service account doesn't have FCM permissions
- In Firebase Console → Project Settings → Service Accounts
- Ensure the service account has "Firebase Admin SDK" role

---

## Current Status

✅ Backend server: Running (PID 6316)
✅ Database: Connected
✅ Users with FCM tokens: 2 (trytry@gmail.com, aman-jhootdeva@gmail.com)
❌ **Firebase Admin: NOT initialized** ← **FIX THIS**
❌ FCM: Unavailable

**Next Steps**:
1. Get Firebase service account JSON from Firebase Console
2. Update `.env` with real credentials
3. Restart backend
4. Test FCM send
5. Create emergency alert and verify notification delivery
