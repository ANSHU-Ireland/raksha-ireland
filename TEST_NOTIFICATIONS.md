# Testing Emergency Notifications

## What Was Fixed

### Backend Changes
1. **Added FCM Token Registration Endpoint**
   - `PUT /api/users/fcm-token` - Registers device FCM token for push notifications
   - Logs when tokens are registered

2. **Added Location Settings Endpoint**
   - `PUT /api/users/location-settings` - Enables/disables location tracking
   - Logs when location is enabled/disabled

### Mobile App Changes
1. **Auto-Registration on Login**
   - FCM token is automatically registered when user logs in
   - Location tracking is automatically enabled after login
   - Added to both login and registration flows

2. **Fixed Location Updates**
   - Location is now sent to backend when emergency alert is created
   - Fixed type errors in location tracking code

## Testing Steps

### Step 1: Install Updated Apps
1. **Physical Device**: Transfer `raksha-ireland-release.apk` to your phone and install it
2. **Emulator**: Already installed with `flutter install`

### Step 2: Fresh Login on Both Devices
**IMPORTANT**: You must log out and log back in on BOTH devices to register FCM tokens

1. **On Emulator**:
   - Open the app
   - If already logged in, log out
   - Log back in with your credentials
   - Watch the backend terminal for: `FCM token registered for user: [email]`
   - Watch for: `Location enabled for user: [email]`

2. **On Physical Device**:
   - Install the updated APK
   - Open the app
   - If already logged in, log out
   - Log back in with your credentials
   - Check backend logs for token registration

### Step 3: Verify FCM Tokens in Database
After both users have logged in, check the database:

```powershell
cd "d:\raksha-ireland\backend"
node -e "const knex = require('knex'); const db = knex({ client: 'pg', connection: 'postgresql://postgres:RakshaIreland2025@db.mcyruxndjbxpvcjqdgyx.supabase.co:5432/postgres' }); db('users').select('email', 'fcm_token', 'location_enabled', 'last_latitude', 'last_longitude').then(users => { users.forEach(u => { console.log('User:', u.email); console.log('  Has FCM Token:', u.fcm_token ? 'YES' : 'NO'); console.log('  Location Enabled:', u.location_enabled); console.log('  Last Location:', u.last_latitude, u.last_longitude); console.log(''); }); process.exit(); });"
```

**Expected Result**: Both users should have:
- `Has FCM Token: YES`
- `Location Enabled: true`
- `Last Location: [coordinates]` (after creating an alert)

### Step 4: Test Emergency Alert
1. On **Device 1** (e.g., physical phone):
   - Ensure location permissions are enabled
   - Create an emergency alert
   - The app will send your location to the backend

2. Backend will:
   - Find all users within 3km radius
   - Filter users who have FCM tokens
   - Send push notifications to those devices

3. On **Device 2** (e.g., emulator):
   - Should receive a push notification
   - Notification should show emergency alert details

### Step 5: Check Backend Logs
Watch for these log messages:

```
[INFO] FCM token registered for user: user@example.com
[INFO] Location enabled for user: user@example.com
[INFO] Location sent to backend: 200
[INFO] Sending emergency alert notifications
```

## Troubleshooting

### No FCM Token in Database
**Solution**: Log out and log back in on that device

### Location Not Updated
**Solution**: Ensure location permissions are granted in app settings

### No Notifications Received
Check:
1. Both users have FCM tokens (query database)
2. Both users have `location_enabled: true`
3. Users are within 3km of each other (check last_latitude/last_longitude)
4. Backend logs show "Sending emergency alert notifications"

### Increase Radius for Testing
If you want to test with devices farther apart, edit:
- `backend/src/routes/emergency.js` line ~39: Change `3` to a larger number (in kilometers)
- `backend/src/services/notificationService.js` line ~29: Change `3000` to a larger number (in meters)

## Backend Server
Make sure backend is running:
```powershell
cd "d:\raksha-ireland\backend"
node src/server.js
```

Server should be accessible at: `http://192.168.8.70:3000/api`

## Files Updated
- `backend/src/routes/users.js` - Added FCM token and location endpoints
- `mobile-app/lib/core/services/auth_service.dart` - Added registerFCMToken() and enableLocationTracking()
- `mobile-app/lib/features/auth/providers/auth_provider.dart` - Auto-initialize on login
- `mobile-app/lib/features/emergency/providers/emergency_provider.dart` - Fixed location updates
- `raksha-ireland-release.apk` - Updated APK with all fixes
