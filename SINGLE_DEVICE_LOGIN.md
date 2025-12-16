# Single Device Login Policy

## Overview
The Raksha app now enforces a single device login policy. Each user account can only be logged in on one physical device at a time.

## How It Works

### Login Flow
1. When a user logs in, the app sends a unique device ID along with credentials
2. The backend checks if the account is already logged in on another device
3. If already logged in elsewhere, login is rejected with error message
4. If not logged in or same device, login proceeds and device ID is stored

### Logout Flow
1. When a user logs out, the backend clears the stored device ID
2. This allows the account to be logged in on a different device

### Device Identification
- Uses `expo-device` to get a unique device identifier
- Device ID is persistent across app reinstalls on the same device
- Different for each physical device

## Implementation Details

### Backend Changes
- **New Function**: `logout.js` - Clears device ID from database
- **Modified Function**: `login.js` - Validates device ID and stores it
- **Database Field**: `loggedInDeviceId` - Stores the currently logged in device

### Mobile App Changes
- **LoginScreen**: Gets device ID and sends with login request
- **App.js**: Calls logout API to clear device ID on logout
- **Error Handling**: Shows specific message when device limit reached

## User Experience

### When Login is Blocked
Users will see:
```
Device Limit Reached
This account is already logged in on another device. 
Please log out from the other device first.
```

### To Switch Devices
1. Log out from the current device using the app
2. Log in on the new device

### Emergency Access
If a user loses access to their logged-in device:
- Contact admin support to manually clear the device ID
- Admin can update the database to remove `loggedInDeviceId` field

## Database Schema Update

The `Users` table now includes:
- `loggedInDeviceId` (string, optional) - Current logged in device identifier
- `lastLogoutAt` (string, optional) - Timestamp of last logout

## API Endpoints

### POST /login
**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "unique-device-identifier"
}
```

**Response (Device Limit)**: HTTP 403
```json
{
  "error": "Device limit reached",
  "message": "This account is already logged in on another device. Please log out from the other device first."
}
```

### POST /logout
**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response**: HTTP 200
```json
{
  "success": true,
  "message": "Logout successful"
}
```

## Testing

### Test Scenario 1: Normal Login
1. Log in on Device A ✅
2. Use app normally ✅
3. Log out ✅
4. Log in on Device B ✅

### Test Scenario 2: Simultaneous Login Attempt
1. Log in on Device A ✅
2. Attempt to log in on Device B ❌
3. Should show "Device Limit Reached" error ✅

### Test Scenario 3: Logout and Switch
1. Log in on Device A ✅
2. Log out from Device A ✅
3. Immediately log in on Device B ✅

## Security Considerations

### Benefits
- Prevents unauthorized account sharing
- Reduces risk of simultaneous access from compromised credentials
- Provides clear audit trail of which device is logged in

### Limitations
- Users must have access to their logged-in device to switch
- Admin intervention required if device is lost/stolen
- Not protection against account takeover if device is cloned

## Future Enhancements

Potential improvements:
1. **Session Timeout**: Auto-logout after period of inactivity
2. **Device Management**: Allow users to see and remotely logout devices
3. **Multiple Device Support**: Allow N devices with device list management
4. **Trusted Devices**: Remember and whitelist specific devices
5. **Force Logout**: Admin capability to remotely log out any device

## Deployment

The logout function is included in the backend deployment:
```bash
cd backend
./deploy.sh
```

This will deploy the new `logout` Lambda function alongside existing functions.
