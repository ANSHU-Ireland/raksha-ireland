# Raksha Ireland - iOS & Android API Unification Plan

## Executive Summary
This document outlines the complete strategy to unify iOS and Android mobile apps to use identical API endpoints, payloads, and Supabase schema for cross-platform emergency alert compatibility.

---

## 1. Current State Analysis

### Backend API Endpoints (via `/backend/local-mock-server.js`)
| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/health` | GET | API health check | ✅ Active |
| `/signup` | POST | User registration | ✅ Active |
| `/login` | POST | User authentication | ✅ Active |
| `/sos` | POST | Emergency SOS alert | ✅ Updated |
| `/admin/users` | GET | Get all users (admin) | ✅ Active |
| `/approve-user` | POST | Approve user (admin) | ✅ Active |
| `/reject-user` | POST | Reject user (admin) | ✅ Active |
| `/register-push-token` | POST | Register FCM/APNS token | ✅ Active |
| `/update-location` | POST | Update user location | ✅ Active |
| `/profile` | GET | Get user profile | ✅ Active |
| `/profile` | PUT | Update user profile | ✅ Active |
| `/nearby-users/:h3Index` | GET | Get nearby users by H3 index | ✅ Active |
| `/test-alert-notification` | POST | Test alert notification | ✅ Updated |
| `/alert-history` | GET | Get alert history | ✅ Active |

### Mobile API Usage (via `/mobile/src/api/`)

**iOS & Android use the same codebase:**
- `aws.js` - Main API client (axios-based) with fallback to Supabase when `EXPO_PUBLIC_USE_SUPABASE=true`
- `supabaseApi.js` - Direct Supabase integration for alerts and history

**Key Functions:**
- `sendSOSAlert()` - Routes to backend `/sos` OR `sendSOSAlertSupabase()`
- `getAlertHistory()` - Routes to backend `/alert-history` OR `getAlertHistorySupabase()`
- `signupUser()` - Backend `/signup`
- `loginUser()` - Backend `/login`
- `updateUserLocation()` - Backend `/update-location`
- `getNearbyUsers()` - Backend `/nearby-users/:h3Index`
- `registerPushToken()` - Backend `/register-push-token`

---

## 2. Supabase Schema Requirements

### Current `emergency_alerts` Table Schema
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | uuid | PK, auto | Alert unique identifier |
| `user_id` | uuid | FK to users.id | Alert creator |
| `latitude` | numeric | NOT NULL | GPS latitude |
| `longitude` | numeric | NOT NULL | GPS longitude |
| `message` | text | DEFAULT 'Emergency assistance needed' | Alert message |
| `status` | text | DEFAULT 'active' | active/resolved |
| `responder_count` | int4 | DEFAULT 0 | # of responders |
| `resolved_at` | timestamptz | nullable | When resolved |
| `created_at` | timestamptz | DEFAULT now() | Alert creation time |
| `updated_at` | timestamptz | DEFAULT now() | Last update time |

### **MISSING Columns (Required for Android Compatibility):**
| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `radius_meters` | INTEGER | 3000 | Alert broadcast radius |
| `name` | TEXT | null | User's name (optional) |
| `phone` | TEXT | null | User's phone (optional) |
| `h3_index` | TEXT | null | H3 geospatial index for fast proximity queries |

### Migration SQL (Already Created)
```sql
-- File: /supabase-add-columns.sql
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 3000;
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS h3_index TEXT;

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_h3_index ON emergency_alerts(h3_index);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_radius ON emergency_alerts(radius_meters);
```

**✅ Action Required:** Execute this SQL in Supabase SQL Editor (Production branch: `main`).

---

## 3. Unified Alert Payload Schema

### `/sos` Endpoint (Backend REST API)
**Request Body:**
```json
{
  "userId": "uuid",
  "location": {
    "latitude": 53.3498,
    "longitude": -6.2603,
    "accuracy": 10.5,
    "timestamp": "2025-12-11T12:00:00.000Z"
  },
  "h3Index": "8c1965d8a242fff",
  "message": "Emergency SOS Alert",
  "radius_meters": 3000,
  "name": "John Doe",
  "phone": "+353871234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Emergency alert sent successfully",
  "alertId": "uuid",
  "alert": {
    "id": "uuid",
    "user_id": "uuid",
    "latitude": 53.3498,
    "longitude": -6.2603,
    "message": "Emergency SOS Alert",
    "radius_meters": 3000,
    "name": "John Doe",
    "phone": "+353871234567",
    "h3_index": "8c1965d8a242fff",
    "status": "active",
    "responder_count": 0,
    "created_at": "2025-12-11T12:00:00.000Z"
  }
}
```

### Supabase Direct Insert (via `sendSOSAlertSupabase()`)
**Payload:**
```javascript
{
  user_id: "uuid",
  latitude: 53.3498,
  longitude: -6.2603,
  message: "Emergency assistance needed",
  radius_meters: 3000,
  h3_index: "8c1965d8a242fff",
  name: "John Doe",
  phone: "+353871234567",
  status: "active",
  responder_count: 0
}
```

---

## 4. iOS vs Android Feature Gap Analysis

### ✅ Feature Parity Achieved
| Feature | iOS | Android | Status |
|---------|-----|---------|--------|
| User signup/login | ✅ | ✅ | Identical |
| SOS button (3s hold) | ✅ | ✅ | Identical |
| Location tracking | ✅ | ✅ | Identical |
| Push notifications | ✅ | ✅ | Identical |
| Alert history view | ✅ | ✅ | Identical |
| Profile management | ✅ | ✅ | Identical |
| Background location | ✅ | ✅ | Identical |

### ⚠️ Schema Alignment Required
| Component | Before | After Migration |
|-----------|--------|-----------------|
| Backend `/sos` payload | Missing `name`, `phone`, `h3_index`, `radius_meters` | ✅ All fields included |
| Supabase table | Missing 4 columns | ✅ Columns added via migration |
| Mobile `supabaseApi.js` | Hardcoded `radius_meters=3000`, missing `h3_index`, `name`, `phone` | ✅ Updated to include all fields |

---

## 5. Implementation Steps (Already Completed)

### ✅ Step 1: Backend Payload Update
**File:** `/backend/local-mock-server.js`

**Updated `/sos` endpoint (lines 227-237):**
```javascript
const alertData = {
  user_id: req.body.userId || 'f0edc01b-a531-43c8-ad3d-aeda54ae09ea',
  latitude: req.body.location?.latitude || req.body.latitude,
  longitude: req.body.location?.longitude || req.body.longitude,
  message: req.body.message || 'Emergency assistance needed',
  radius_meters: req.body.radius_meters || 3000,
  name: req.body.name || null,
  phone: req.body.phone || null,
  h3_index: req.body.h3Index || req.body.h3_index || null,
  status: 'active',
  responder_count: 0
};
```

**Updated `/test-alert-notification` endpoint (lines 468-480):**
```javascript
const testAlert = {
  user_id: req.body.userId || 'f0edc01b-a531-43c8-ad3d-aeda54ae09ea',
  latitude: req.body.latitude || 53.3498,
  longitude: req.body.longitude || -6.2603,
  message: req.body.message || 'Emergency assistance needed',
  radius_meters: req.body.radius_meters || 3000,
  name: req.body.name || null,
  phone: req.body.phone || null,
  h3_index: req.body.h3_index || null,
  status: 'active',
  responder_count: 0
};
```

### ✅ Step 2: Mobile Supabase API Update
**File:** `/mobile/src/api/supabaseApi.js`

**Updated `sendSOSAlertSupabase()` function (lines 45-80):**
```javascript
export async function sendSOSAlertSupabase(sosData) {
  try {
    const savedUserStr = await AsyncStorage.getItem('user');
    const appUser = savedUserStr ? JSON.parse(savedUserStr) : null;
    const supabaseUserId = await ensureSupabaseUserId(appUser);

    const latitude = sosData?.location?.latitude;
    const longitude = sosData?.location?.longitude;
    const message = sosData?.message || 'Emergency assistance needed';
    const radius_meters = sosData?.radius_meters || 3000;
    const h3_index = sosData?.h3Index || null;
    const name = sosData?.name || appUser?.full_name || appUser?.name || null;
    const phone = sosData?.phone || appUser?.phone_number || appUser?.phone || null;

    const payload = {
      user_id: supabaseUserId,
      latitude,
      longitude,
      message,
      radius_meters,
      h3_index,
      name,
      phone,
      status: 'active',
      responder_count: 0,
    };

    const { data, error } = await supabase
      .from('emergency_alerts')
      .insert([payload])
      .select('id');

    if (error) throw error;

    return { success: true, id: data?.[0]?.id };
  } catch (error) {
    console.warn('[Supabase] sendSOSAlert failed', error.message);
    throw new Error('Failed to send SOS via Supabase');
  }
}
```

**Key improvements:**
- Extracts `name` and `phone` from stored user session (`appUser`)
- Accepts `h3_index` from `sosData.h3Index`
- Accepts custom `radius_meters` from `sosData.radius_meters` (defaults to 3000)
- Adds `responder_count: 0` to match backend schema

---

## 6. Supabase Schema Migration

### Execute in Supabase SQL Editor:
```sql
-- Add missing columns to emergency_alerts table
ALTER TABLE emergency_alerts 
ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 3000;

ALTER TABLE emergency_alerts 
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE emergency_alerts 
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE emergency_alerts 
ADD COLUMN IF NOT EXISTS h3_index TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_h3_index ON emergency_alerts(h3_index);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_radius ON emergency_alerts(radius_meters);

-- Verify schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'emergency_alerts'
ORDER BY ordinal_position;
```

**Expected Result:**
```
column_name      | data_type        | is_nullable | column_default
----------------|------------------|-------------|------------------
id              | uuid             | NO          | gen_random_uuid()
user_id         | uuid             | YES         | NULL
latitude        | numeric          | NO          | NULL
longitude       | numeric          | NO          | NULL
message         | text             | YES         | 'Emergency assistance needed'
status          | text             | YES         | 'active'
responder_count | integer          | YES         | 0
resolved_at     | timestamptz      | YES         | NULL
created_at      | timestamptz      | YES         | now()
updated_at      | timestamptz      | YES         | now()
radius_meters   | integer          | YES         | 3000
name            | text             | YES         | NULL
phone           | text             | YES         | NULL
h3_index        | text             | YES         | NULL
```

---

## 7. Testing & Verification

### Local Backend Test (After Migration)
```bash
# Start backend
cd /Users/areiva/Desktop/Raksha/raksha-ireland/backend
node local-mock-server.js &

# Test with full payload
curl -X POST http://localhost:3000/test-alert-notification \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Cross-platform test SUCCESS",
    "latitude": 53.3498,
    "longitude": -6.2603,
    "radius_meters": 5000,
    "name": "Test User",
    "phone": "+353871234567",
    "h3_index": "8c1965d8a242fff"
  }' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test notification created",
  "alert": {
    "id": "uuid",
    "user_id": "f0edc01b-a531-43c8-ad3d-aeda54ae09ea",
    "latitude": 53.3498,
    "longitude": -6.2603,
    "message": "Cross-platform test SUCCESS",
    "radius_meters": 5000,
    "name": "Test User",
    "phone": "+353871234567",
    "h3_index": "8c1965d8a242fff",
    "status": "active",
    "responder_count": 0,
    "created_at": "2025-12-11T12:00:00.000Z"
  }
}
```

### EC2 Deployment & Test
```bash
# Deploy updated backend to EC2
scp backend/.env backend/local-mock-server.js ubuntu@ec2-3-254-75-134.eu-west-1.compute.amazonaws.com:/home/ubuntu/raksha-ireland/backend/

# SSH to EC2 and restart
ssh ubuntu@ec2-3-254-75-134.eu-west-1.compute.amazonaws.com
cd /home/ubuntu/raksha-ireland/backend
pm2 restart raksha-backend
pm2 logs raksha-backend --lines 30

# Test EC2 endpoint
curl -X POST http://ec2-3-254-75-134.eu-west-1.compute.amazonaws.com/test-alert-notification \
  -H "Content-Type: application/json" \
  -d '{"message":"EC2 test","latitude":53.3498,"longitude":-6.2603,"radius_meters":3000}' | jq .
```

### Mobile App Test (iOS & Android)
1. **Rebuild mobile app** with updated `supabaseApi.js`:
   ```bash
   cd /Users/areiva/Desktop/Raksha/raksha-ireland/mobile
   npm start
   ```

2. **Test SOS flow:**
   - Open app on iOS device
   - Login with test user
   - Hold SOS button for 3 seconds
   - Verify alert appears in Supabase `emergency_alerts` table with all fields populated
   - Check alert history screen shows the alert
   - Repeat on Android device
   - Confirm cross-platform visibility

3. **Verify Supabase records:**
   - Open Supabase Dashboard → Table Editor → `emergency_alerts`
   - Confirm latest record has: `radius_meters`, `name`, `phone`, `h3_index` populated

---

## 8. Missing iOS Features (To Implement)

### ❌ Features Android Has That iOS Needs:
**None identified.** Both iOS and Android share the same React Native codebase (`/mobile/`), so feature parity is automatic once the backend and Supabase schema are aligned.

### ✅ Enhancements for Both Platforms:
1. **Real-time alert subscriptions** (Supabase Realtime):
   ```javascript
   // Add to supabaseApi.js
   export function subscribeToAlerts(callback) {
     return supabase
       .channel('emergency_alerts')
       .on('postgres_changes', { 
         event: 'INSERT', 
         schema: 'public', 
         table: 'emergency_alerts' 
       }, payload => {
         callback(payload.new);
       })
       .subscribe();
   }
   ```

2. **Nearby user queries using h3_index**:
   ```javascript
   // Add to supabaseApi.js
   export async function getNearbyAlertsByH3(h3Index) {
     const { data, error } = await supabase
       .from('emergency_alerts')
       .select('*')
       .eq('h3_index', h3Index)
       .eq('status', 'active')
       .order('created_at', { ascending: false });
     
     if (error) throw error;
     return data;
   }
   ```

3. **JWT authentication for backend endpoints**:
   - Currently using mock tokens
   - Recommend implementing Supabase Auth tokens for production

---

## 9. Deployment Checklist

### Pre-Deployment
- [x] Backend payload updated with all fields
- [x] Mobile Supabase API updated with all fields
- [ ] **Execute Supabase migration SQL** (CRITICAL - blocks testing)
- [ ] Test local backend with full payload
- [ ] Test mobile app SOS flow locally

### Production Deployment
- [ ] Deploy updated backend to EC2
- [ ] Restart PM2 process on EC2
- [ ] Verify EC2 health check
- [ ] Test EC2 `/test-alert-notification` endpoint
- [ ] Build production mobile app (iOS & Android)
- [ ] Submit iOS build to TestFlight
- [ ] Submit Android build to Google Play Internal Testing
- [ ] End-to-end cross-platform test

### Post-Deployment Verification
- [ ] Create alert from iOS → verify visible on Android
- [ ] Create alert from Android → verify visible on iOS
- [ ] Check Supabase table has all fields populated
- [ ] Monitor backend logs for errors
- [ ] Check push notification delivery

---

## 10. API Documentation (Reference)

### Authentication Endpoints

#### `POST /signup`
Register new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123",
  "phone": "+353871234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Pending admin approval.",
  "userId": "user-1234567890",
  "status": "pending"
}
```

#### `POST /login`
Authenticate user and get session token.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "mock-jwt-token-1234567890",
  "user": {
    "userId": "user-1234567890",
    "email": "john@example.com",
    "name": "John Doe",
    "phone": "+353871234567",
    "status": "activated"
  }
}
```

### Emergency Alert Endpoints

#### `POST /sos`
Create emergency SOS alert.

**Request:**
```json
{
  "userId": "user-1234567890",
  "location": {
    "latitude": 53.3498,
    "longitude": -6.2603,
    "accuracy": 10.5,
    "timestamp": "2025-12-11T12:00:00.000Z"
  },
  "h3Index": "8c1965d8a242fff",
  "message": "Emergency SOS Alert",
  "radius_meters": 3000,
  "name": "John Doe",
  "phone": "+353871234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Emergency alert sent successfully",
  "alertId": "uuid",
  "alert": { /* full alert object */ }
}
```

#### `GET /alert-history`
Retrieve alert history (last 100 alerts).

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "John Doe",
      "phone": "+353871234567",
      "latitude": 53.3498,
      "longitude": -6.2603,
      "message": "Emergency assistance needed",
      "radius_meters": 3000,
      "h3_index": "8c1965d8a242fff",
      "status": "active",
      "responder_count": 0,
      "created_at": "2025-12-11T12:00:00.000Z"
    }
  ]
}
```

#### `GET /nearby-users/:h3Index`
Get users in same H3 cell for proximity alerts.

**Response:**
```json
{
  "users": [
    {
      "userId": "uuid",
      "name": "Jane Smith",
      "location": {
        "latitude": 53.3500,
        "longitude": -6.2600
      },
      "lastSeen": "2025-12-11T11:55:00.000Z"
    }
  ]
}
```

### User Management Endpoints

#### `GET /profile`
Get current user profile.

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "user-1234567890",
    "email": "john@example.com",
    "name": "John Doe",
    "phone": "+353871234567",
    "profileImage": "https://..."
  }
}
```

#### `PUT /profile`
Update user profile.

**Request:**
```json
{
  "name": "John Doe Updated",
  "phone": "+353871234567",
  "profileImage": "base64..."
}
```

#### `POST /update-location`
Update user's current location for tracking.

**Request:**
```json
{
  "latitude": 53.3498,
  "longitude": -6.2603,
  "accuracy": 10.5,
  "timestamp": "2025-12-11T12:00:00.000Z"
}
```

#### `POST /register-push-token`
Register device for push notifications.

**Request:**
```json
{
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxx]",
  "timestamp": "2025-12-11T12:00:00.000Z"
}
```

---

## 11. Next Actions

### Immediate (User Action Required):
1. **Execute Supabase migration:**
   - Open Supabase Dashboard → SQL Editor
   - Paste contents of `/supabase-add-columns.sql`
   - Click "Run"
   - Verify 4 columns added successfully

### After Migration:
2. **Test local backend:**
   ```bash
   cd /Users/areiva/Desktop/Raksha/raksha-ireland/backend
   pkill -f "node local-mock-server.js"; sleep 1; node local-mock-server.js &
   curl -X POST http://localhost:3000/test-alert-notification \
     -H "Content-Type: application/json" \
     -d '{"message":"Test","latitude":53.3498,"longitude":-6.2603,"radius_meters":5000,"name":"Test User","phone":"+353871234567","h3_index":"8c1965d8a242fff"}' | jq .
   ```

3. **Deploy to EC2:**
   ```bash
   scp backend/.env backend/local-mock-server.js ubuntu@ec2-3-254-75-134.eu-west-1.compute.amazonaws.com:/home/ubuntu/raksha-ireland/backend/
   ssh ubuntu@ec2-3-254-75-134.eu-west-1.compute.amazonaws.com "cd /home/ubuntu/raksha-ireland/backend && pm2 restart raksha-backend"
   ```

4. **Rebuild mobile app:**
   ```bash
   cd /Users/areiva/Desktop/Raksha/raksha-ireland/mobile
   npm start
   # Test on both iOS and Android devices
   ```

5. **End-to-end test:**
   - Create alert from iOS
   - Verify appears on Android
   - Check Supabase table has all fields
   - Confirm cross-platform visibility

---

## 12. Success Criteria

✅ **Backend:**
- `/sos` endpoint accepts and persists all fields: `radius_meters`, `name`, `phone`, `h3_index`
- `/test-alert-notification` successfully inserts into Supabase with all fields
- `/alert-history` returns alerts with all fields

✅ **Supabase:**
- `emergency_alerts` table has 14 columns (including 4 new ones)
- Indexes created on `h3_index` and `radius_meters`
- Inserts succeed without schema errors

✅ **Mobile (iOS & Android):**
- `sendSOSAlertSupabase()` includes all fields in payload
- Alerts created from iOS appear on Android devices
- Alerts created from Android appear on iOS devices
- Alert history displays complete information

✅ **Cross-Platform:**
- No schema mismatch errors
- All alerts persist to Supabase
- Real-time visibility across platforms

---

## Contact & Support
- **Backend:** Node.js + Express on EC2 (eu-west-1)
- **Database:** Supabase (PostgreSQL)
- **Mobile:** React Native + Expo
- **Repository:** ANSHU-Ireland/raksha-ireland (master branch)
