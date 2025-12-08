# Raksha Ireland - Comprehensive Test Script

**Test Date:** ____________  
**Tester Name:** ____________  
**App Version:** 1.0.0  
**Backend URL:** http://192.168.8.70:3000  

---

## Pre-Test Setup

### Environment Check
- [ ] Backend server running on http://192.168.8.70:3000
- [ ] Database accessible (Supabase connection active)
- [ ] Firebase Admin SDK initialized
- [ ] Two physical Android devices ready
- [ ] Both devices connected to same WiFi network
- [ ] Location services enabled on both devices
- [ ] APK installed on both devices: `raksha-ireland-release.apk`

### Test Accounts
**Device 1 (Primary Tester):**
- Email: `trytry@gmail.com`
- Password: ____________
- Full Name: ____________

**Device 2 (Secondary Tester):**
- Email: `aman-jhootdeva@gmail.com`
- Password: ____________
- Full Name: ____________

### Admin Panel Access
- URL: http://192.168.8.70:3000/api/admin/users
- Username: `admin`
- Password: `admin123`

---

## TEST SECTION 1: Authentication & User Management

### 1.1 User Registration
**Device:** Both  
**Priority:** Critical

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Open app for first time | Splash screen → Login screen | ☐ Pass ☐ Fail | |
| 2 | Tap "Don't have an account? Register" | Navigate to registration screen | ☐ Pass ☐ Fail | |
| 3 | Enter invalid email (test@test) | Show email validation error | ☐ Pass ☐ Fail | |
| 4 | Enter password < 6 characters | Show password length error | ☐ Pass ☐ Fail | |
| 5 | Enter mismatched passwords | Show password mismatch error | ☐ Pass ☐ Fail | |
| 6 | Leave full name empty | Show required field error | ☐ Pass ☐ Fail | |
| 7 | Enter valid details | Registration successful, navigate to home | ☐ Pass ☐ Fail | |
| 8 | Check Firebase Auth console | New user created | ☐ Pass ☐ Fail | |

**Expected Behavior:**
- All validation errors display properly
- Loading indicator shows during registration
- Successful registration creates user in Firebase & Database
- User automatically logged in after registration

---

### 1.2 User Login
**Device:** Both  
**Priority:** Critical

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Enter incorrect email | Show "Invalid credentials" error | ☐ Pass ☐ Fail | |
| 2 | Enter incorrect password | Show "Invalid credentials" error | ☐ Pass ☐ Fail | |
| 3 | Enter correct credentials | Login successful, navigate to home | ☐ Pass ☐ Fail | |
| 4 | Force close app and reopen | User remains logged in | ☐ Pass ☐ Fail | |

**Expected Behavior:**
- Error messages clear and helpful
- Loading indicator during login
- FCM token registered on successful login
- Session persists across app restarts

---

### 1.3 User Profile Management
**Device:** Device 1  
**Priority:** High

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | From home screen, tap profile icon | Navigate to profile screen | ☐ Pass ☐ Fail | |
| 2 | Verify displayed information | Shows correct name, email, phone | ☐ Pass ☐ Fail | |
| 3 | Tap "Edit" icon in AppBar | Navigate to edit profile screen | ☐ Pass ☐ Fail | |
| 4 | Change full name | Update successful, shows success message | ☐ Pass ☐ Fail | |
| 5 | Add/update phone number | Update successful with validation | ☐ Pass ☐ Fail | |
| 6 | Change password (old + new) | Password changed, shows success | ☐ Pass ☐ Fail | |
| 7 | Return to profile screen | Updated information displayed | ☐ Pass ☐ Fail | |
| 8 | Tap "Alert History" icon | Navigate to alert history | ☐ Pass ☐ Fail | |

**Expected Behavior:**
- All profile fields editable
- Phone number validates format
- Password change requires old password
- Changes persist after app restart

---

### 1.4 User Verification (Admin Panel)
**Device:** Desktop Browser  
**Priority:** High

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Navigate to admin URL | Shows basic auth prompt | ☐ Pass ☐ Fail | |
| 2 | Enter wrong credentials | Access denied | ☐ Pass ☐ Fail | |
| 3 | Enter correct credentials (admin/admin123) | Shows user list table | ☐ Pass ☐ Fail | |
| 4 | Find test user in list | User displayed with status | ☐ Pass ☐ Fail | |
| 5 | Click "Verify" button | Status changes to "verified" | ☐ Pass ☐ Fail | |
| 6 | Check database | `verification_status` = 'verified' | ☐ Pass ☐ Fail | |
| 7 | Click "Reject" on another user | Status changes to "rejected" | ☐ Pass ☐ Fail | |

**API Test:**
```bash
# PUT request to verify user
curl -X PUT http://192.168.8.70:3000/api/admin/users/{USER_ID}/verify \
  -H "Authorization: Basic YWRtaW46YWRtaW4xMjM=" \
  -H "Content-Type: application/json" \
  -d '{"status": "verified"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User verified successfully",
  "user": {
    "verification_status": "verified"
  }
}
```

---

## TEST SECTION 2: Location Services

### 2.1 Location Permission & Tracking
**Device:** Both  
**Priority:** Critical

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Fresh app install | App requests location permission | ☐ Pass ☐ Fail | |
| 2 | Deny location permission | Shows permission required message | ☐ Pass ☐ Fail | |
| 3 | Grant location permission | Permission granted, no error | ☐ Pass ☐ Fail | |
| 4 | Check location settings toggle | Location enabled by default | ☐ Pass ☐ Fail | |
| 5 | Toggle location OFF | Location tracking disabled | ☐ Pass ☐ Fail | |
| 6 | Toggle location ON | Location tracking enabled | ☐ Pass ☐ Fail | |
| 7 | Move physically 100+ meters | Backend receives updated coordinates | ☐ Pass ☐ Fail | |
| 8 | Check database `last_latitude`, `last_longitude` | Updated with current position | ☐ Pass ☐ Fail | |

**Database Check:**
```sql
SELECT email, last_latitude, last_longitude, location_enabled, updated_at 
FROM users 
WHERE email = 'trytry@gmail.com';
```

**Expected Behavior:**
- Location updates every 30 seconds when enabled
- Background location tracking works when app minimized
- Coordinates accurate to ~10 meters
- `location_enabled` flag syncs with backend

---

### 2.2 Distance Calculation (3km Radius)
**Device:** Both  
**Priority:** Critical

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Position Device 1 and Device 2 < 3km apart | Haversine distance calculated correctly | ☐ Pass ☐ Fail | Distance: _____ km |
| 2 | Check backend logs when alert sent | Shows distance calculation for each user | ☐ Pass ☐ Fail | |
| 3 | Position Device 2 > 3km from Device 1 | Device 2 NOT in nearby users list | ☐ Pass ☐ Fail | Distance: _____ km |
| 4 | Send alert from Device 1 | Device 2 does NOT receive notification | ☐ Pass ☐ Fail | |

**Backend Log Example:**
```
[DISTANCE] aman-jhootdeva@gmail.com | enabled=true | pos=(53.350140,-6.266155) | dist=2.456 km | within=true
```

**Haversine Formula Validation:**
- Manual calculation: _____________
- Backend calculation: _____________
- Match: ☐ Yes ☐ No

---

## TEST SECTION 3: Emergency Alert System

### 3.1 SOS Alert Creation
**Device:** Device 1  
**Priority:** Critical

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Tap "Emergency SOS" from home | Navigate to Emergency screen | ☐ Pass ☐ Fail | |
| 2 | Verify "How SOS Works" section visible | Page is scrollable, all content visible | ☐ Pass ☐ Fail | |
| 3 | Scroll to SOS button | Red circular button displayed | ☐ Pass ☐ Fail | |
| 4 | Verify welcome text color | "Welcome to Raksha Ireland" is white | ☐ Pass ☐ Fail | |
| 5 | Tap SOS button | Confirmation dialog appears | ☐ Pass ☐ Fail | |
| 6 | Cancel confirmation | Dialog dismissed, no alert sent | ☐ Pass ☐ Fail | |
| 7 | Tap SOS button again, confirm | Alert sent, success message shown | ☐ Pass ☐ Fail | |
| 8 | Check SOS button state | Button shows "ALERT ACTIVE" | ☐ Pass ☐ Fail | |
| 9 | Verify cooldown timer | Shows countdown from 60 seconds | ☐ Pass ☐ Fail | |
| 10 | Try to send another alert immediately | Button disabled during cooldown | ☐ Pass ☐ Fail | |
| 11 | Wait for cooldown to finish | Button returns to "SEND EMERGENCY SOS" | ☐ Pass ☐ Fail | |

**Backend Logs to Check:**
```
[EMERGENCY] Alert created by trytry@gmail.com at (53.350140,-6.266155)
[EMERGENCY] Evaluating X candidates for 3km radius...
[NOTIFICATION] Found X nearby users with location enabled (excluding alert creator)
[NOTIFICATION] X users have FCM tokens
[NOTIFICATION] ✅ Sent notifications to X/X devices
```

**Expected Behavior:**
- Alert saves to database with status='active'
- Current location captured accurately
- Cooldown prevents spam alerts
- UI states transition smoothly

---

### 3.2 FCM Push Notification Delivery
**Device:** Device 2 (Receiver)  
**Priority:** Critical

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Device 1 sends SOS alert | Device 2 receives notification within 5 seconds | ☐ Pass ☐ Fail | Delay: _____ sec |
| 2 | Check notification title | Shows "🚨 Emergency Alert Nearby" | ☐ Pass ☐ Fail | |
| 3 | Check notification body | Shows sender name + message | ☐ Pass ☐ Fail | |
| 4 | App in background | Notification appears in status bar | ☐ Pass ☐ Fail | |
| 5 | App in foreground | In-app notification displayed | ☐ Pass ☐ Fail | |
| 6 | Tap notification | Opens app to nearby alerts screen | ☐ Pass ☐ Fail | |
| 7 | App closed completely | Notification still received | ☐ Pass ☐ Fail | |
| 8 | Check notification sound/vibration | Plays sound + vibrates | ☐ Pass ☐ Fail | |

**Self-Notification Bug Test:**
| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Device 1 sends alert | Device 1 does NOT receive own notification | ☐ Pass ☐ Fail | |
| 2 | Check Device 1 nearby alerts | Own alert NOT shown in list | ☐ Pass ☐ Fail | |
| 3 | Check backend logs | Sender excluded from recipients | ☐ Pass ☐ Fail | |

**Expected Log:**
```
[NOTIFICATION] Recipient 1: Aman Jhootdeva (aman-jhootdeva@gmail.com)
// Should NOT include trytry@gmail.com
```

---

### 3.3 Nearby Alerts Display
**Device:** Device 2  
**Priority:** High

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | From home, tap "Nearby Emergencies" | Navigate to nearby alerts screen | ☐ Pass ☐ Fail | |
| 2 | Verify alert card displayed | Shows alert from Device 1 | ☐ Pass ☐ Fail | |
| 3 | Check alert details | Shows name, message, distance, time | ☐ Pass ☐ Fail | |
| 4 | Verify status badge | Shows "Active" in orange/red | ☐ Pass ☐ Fail | |
| 5 | Check responder count | Shows "0 responders" initially | ☐ Pass ☐ Fail | |
| 6 | Pull to refresh | Loading indicator, alerts reload | ☐ Pass ☐ Fail | |
| 7 | Refresh multiple times | No errors, page doesn't break | ☐ Pass ☐ Fail | |

**Expected Behavior:**
- Alerts sorted by creation time (newest first)
- Distance calculated and displayed accurately
- Time shown in relative format ("2 mins ago")
- Empty state shown if no nearby alerts

---

### 3.4 Respond to Alert
**Device:** Device 2  
**Priority:** Critical

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Tap "Respond" button on alert card | Confirmation dialog appears | ☐ Pass ☐ Fail | |
| 2 | Cancel confirmation | Dialog dismissed, no response sent | ☐ Pass ☐ Fail | |
| 3 | Tap "Respond" again, confirm | Response sent successfully | ☐ Pass ☐ Fail | |
| 4 | Check success message | Shows "Response sent! Person has been notified." | ☐ Pass ☐ Fail | |
| 5 | Verify alert card updates | Status changes to "Responded" | ☐ Pass ☐ Fail | |
| 6 | Check responder count | Increments to "1 responders" | ☐ Pass ☐ Fail | |
| 7 | Try to respond again | Shows "Already responded" message | ☐ Pass ☐ Fail | |
| 8 | Respond button state | Disabled or shows "Responded" | ☐ Pass ☐ Fail | |

**Device 1 (Alert Creator) - Response Notification:**
| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Device 2 responds | Device 1 receives notification within 5 sec | ☐ Pass ☐ Fail | Delay: _____ sec |
| 2 | Check notification title | Shows "✅ Help is on the way!" | ☐ Pass ☐ Fail | |
| 3 | Check notification body | Shows responder name | ☐ Pass ☐ Fail | |
| 4 | Tap notification | Opens app (appropriate screen) | ☐ Pass ☐ Fail | |

**Database Verification:**
```sql
SELECT * FROM alert_responses 
WHERE alert_id = 'ALERT_UUID' 
ORDER BY responded_at DESC;
```

**Expected:**
- Record created with responder_id, alert_id
- `responded_at` timestamp accurate
- Duplicate constraint prevents multiple responses from same user

**Backend Logs:**
```
[RESPOND] User responded to alert: ALERT_UUID
[NOTIFICATION] Sent response notification to alert creator
```

---

### 3.5 Google Maps Directions
**Device:** Device 2  
**Priority:** High

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | On alert card, tap "Directions" button | Google Maps app opens | ☐ Pass ☐ Fail | |
| 2 | Verify destination | Alert location set as destination | ☐ Pass ☐ Fail | Lat/Long: _________ |
| 3 | Check route | Directions from current location shown | ☐ Pass ☐ Fail | |
| 4 | If Google Maps not installed | Opens in browser/map selector | ☐ Pass ☐ Fail | |

**URL Format Check:**
```
https://www.google.com/maps/dir/?api=1&destination=LAT,LNG
```

**Expected Behavior:**
- Opens external app (not in-app webview)
- Coordinates passed correctly
- Falls back gracefully if no map app

---

### 3.6 Mark Alert as Resolved
**Device:** Device 1 (Alert Creator)  
**Priority:** High

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Navigate to Emergency screen | Shows active alert status | ☐ Pass ☐ Fail | |
| 2 | Tap "Mark Resolved" button | Confirmation dialog appears | ☐ Pass ☐ Fail | |
| 3 | Cancel confirmation | Dialog dismissed, status unchanged | ☐ Pass ☐ Fail | |
| 4 | Tap "Mark Resolved" again, confirm | Alert resolved successfully | ☐ Pass ☐ Fail | |
| 5 | Check success message | Shows resolution confirmation | ☐ Pass ☐ Fail | |
| 6 | Verify SOS button state | Returns to "SEND EMERGENCY SOS" | ☐ Pass ☐ Fail | |
| 7 | Check backend | PATCH request sent to /alerts/:id | ☐ Pass ☐ Fail | |

**Device 2 (After Resolution):**
| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Refresh nearby alerts | Alert disappears from list (status='resolved') | ☐ Pass ☐ Fail | |
| 2 | Check if alert shown | Not shown in nearby alerts (status filtered) | ☐ Pass ☐ Fail | |

**Database Verification:**
```sql
SELECT id, status, resolved_at, updated_at 
FROM emergency_alerts 
WHERE id = 'ALERT_UUID';
```

**Expected:**
- `status` = 'resolved'
- `resolved_at` timestamp set
- `updated_at` timestamp updated

**API Test:**
```bash
curl -X PATCH http://192.168.8.70:3000/api/emergency/alerts/{ALERT_ID} \
  -H "Authorization: Bearer {FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved"}'
```

---

### 3.7 Alert History
**Device:** Device 1  
**Priority:** Medium

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | From profile screen, tap history icon | Navigate to alert history screen | ☐ Pass ☐ Fail | |
| 2 | Verify past alerts displayed | Shows user's own alerts only | ☐ Pass ☐ Fail | |
| 3 | Check alert details | Shows status, time, responder count | ☐ Pass ☐ Fail | |
| 4 | Verify sorting | Newest alerts first | ☐ Pass ☐ Fail | |
| 5 | Check status indicators | Different colors for active/resolved/cancelled | ☐ Pass ☐ Fail | |
| 6 | Tap on an alert | Shows detailed alert information | ☐ Pass ☐ Fail | |
| 7 | Pull to refresh | Reloads alert history | ☐ Pass ☐ Fail | |

**API Endpoint:**
```
GET /api/emergency/alerts
```

**Expected Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "id": "uuid",
      "status": "resolved",
      "created_at": "2025-12-06T17:00:00.000Z",
      "responder_count": 2
    }
  ],
  "count": 1
}
```

---

## TEST SECTION 4: Error Handling & Edge Cases

### 4.1 Network Failures
**Device:** Device 1  
**Priority:** High

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Enable Airplane Mode | App shows offline indicator | ☐ Pass ☐ Fail | |
| 2 | Try to send alert | Shows network error message | ☐ Pass ☐ Fail | |
| 3 | Disable Airplane Mode | App reconnects automatically | ☐ Pass ☐ Fail | |
| 4 | Retry alert sending | Alert sent successfully | ☐ Pass ☐ Fail | |
| 5 | Disconnect WiFi mid-request | Shows error, doesn't crash | ☐ Pass ☐ Fail | |
| 6 | Reconnect WiFi | App recovers gracefully | ☐ Pass ☐ Fail | |

**Expected Behavior:**
- Graceful error messages (not technical jargon)
- No app crashes
- Automatic retry mechanisms where appropriate
- Loading states clear when errors occur

---

### 4.2 Invalid/Expired Tokens
**Device:** Both  
**Priority:** Medium

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Manually expire Firebase token (backend) | Next API call returns 401 | ☐ Pass ☐ Fail | |
| 2 | App handles 401 | Redirects to login screen | ☐ Pass ☐ Fail | |
| 3 | Login again | Token refreshed, app works normally | ☐ Pass ☐ Fail | |

---

### 4.3 Location Services Disabled
**Device:** Device 1  
**Priority:** High

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Disable device GPS | App detects location unavailable | ☐ Pass ☐ Fail | |
| 2 | Try to send alert | Shows "Location required" error | ☐ Pass ☐ Fail | |
| 3 | Check nearby alerts | Shows "Location not available" message | ☐ Pass ☐ Fail | |
| 4 | Enable GPS | App resumes location tracking | ☐ Pass ☐ Fail | |

---

### 4.4 Database Connection Loss
**Device:** Backend  
**Priority:** Medium

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Stop Supabase database | Backend logs connection error | ☐ Pass ☐ Fail | |
| 2 | App makes API request | Returns 500 error gracefully | ☐ Pass ☐ Fail | |
| 3 | Restart database | Backend reconnects automatically | ☐ Pass ☐ Fail | |
| 4 | App retries request | Request succeeds | ☐ Pass ☐ Fail | |

---

### 4.5 Concurrent Alert Responses
**Device:** Multiple  
**Priority:** Medium

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Device 1 sends alert | Alert created | ☐ Pass ☐ Fail | |
| 2 | Device 2 and Device 3 respond simultaneously | Both responses recorded | ☐ Pass ☐ Fail | |
| 3 | Check responder_count | Accurately reflects 2 responders | ☐ Pass ☐ Fail | |
| 4 | Check alert_responses table | 2 unique records created | ☐ Pass ☐ Fail | |

---

### 4.6 Refresh After Respond Bug (FIXED)
**Device:** Device 2  
**Priority:** Critical

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Respond to an alert | Response successful | ☐ Pass ☐ Fail | |
| 2 | Pull to refresh nearby alerts | Page refreshes without errors | ☐ Pass ☐ Fail | |
| 3 | Verify alert still visible | Alert shown with "Responded" status | ☐ Pass ☐ Fail | |
| 4 | Refresh multiple times | No crashes, no error screens | ☐ Pass ☐ Fail | |

**Bug Context:**
- Previous issue: Global error state blocked UI after respond
- Fix: Removed `_setError()` calls in catch blocks
- Verification: Refresh should not break page

---

### 4.7 Active Alerts After Mark Resolved (FIXED)
**Device:** Both  
**Priority:** Critical

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| 1 | Device 1 creates alert | Alert appears in Device 2 nearby alerts | ☐ Pass ☐ Fail | |
| 2 | Device 1 marks alert as resolved | Backend updates status='resolved' | ☐ Pass ☐ Fail | |
| 3 | Device 2 refreshes nearby alerts | Resolved alert disappears from list | ☐ Pass ☐ Fail | |
| 4 | Check backend filter | Query filters out 'resolved' status | ☐ Pass ☐ Fail | |

**Backend Query Check:**
```javascript
.whereIn('emergency_alerts.status', ['active', 'responded'])
// Should NOT include 'resolved'
```

**Database Verification:**
```sql
-- Nearby alerts query should exclude resolved
SELECT * FROM emergency_alerts 
WHERE status IN ('active', 'responded') 
AND user_id != 'CURRENT_USER_ID';
```

---

## TEST SECTION 5: Performance & Stability

### 5.1 App Startup Performance
**Device:** Both  
**Priority:** Medium

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Cold start time | < 3 seconds | _______ sec | ☐ Pass ☐ Fail |
| Hot start time | < 1 second | _______ sec | ☐ Pass ☐ Fail |
| Initial data load | < 5 seconds | _______ sec | ☐ Pass ☐ Fail |
| FCM token registration | < 2 seconds | _______ sec | ☐ Pass ☐ Fail |

---

### 5.2 Memory Usage
**Device:** Both  
**Priority:** Low

| Scenario | Memory Usage | Pass/Fail | Notes |
|----------|--------------|-----------|-------|
| Idle on home screen | _______ MB | ☐ Pass ☐ Fail | |
| Nearby alerts (10 alerts) | _______ MB | ☐ Pass ☐ Fail | |
| After 1 hour usage | _______ MB | ☐ Pass ☐ Fail | Memory leak: ☐ Yes ☐ No |

---

### 5.3 Battery Impact
**Device:** Device 1  
**Priority:** Medium

| Scenario | Duration | Battery Drain | Pass/Fail |
|----------|----------|---------------|-----------|
| Background location tracking | 1 hour | _______ % | ☐ Pass ☐ Fail |
| Active usage | 30 mins | _______ % | ☐ Pass ☐ Fail |
| Idle with notifications | 1 hour | _______ % | ☐ Pass ☐ Fail |

**Expected:** < 10% drain per hour for active usage

---

### 5.4 Stress Testing
**Device:** Both  
**Priority:** Medium

| Test | Action | Expected Result | Pass/Fail | Notes |
|------|--------|----------------|-----------|-------|
| Rapid alert creation | Send 5 alerts in 5 minutes | Cooldown prevents spam | ☐ Pass ☐ Fail | |
| Rapid refresh | Pull to refresh 20 times quickly | No crashes, no errors | ☐ Pass ☐ Fail | |
| Large alert list | Load 50+ nearby alerts | Scrolling smooth, no lag | ☐ Pass ☐ Fail | |
| Long session | Use app continuously for 2 hours | No crashes, stable performance | ☐ Pass ☐ Fail | |

---

## TEST SECTION 6: UI/UX Validation

### 6.1 Visual Consistency
**Device:** Both  
**Priority:** Low

| Element | Check | Pass/Fail | Notes |
|---------|-------|-----------|-------|
| Color scheme | Consistent across screens | ☐ Pass ☐ Fail | |
| Font sizes | Readable, proper hierarchy | ☐ Pass ☐ Fail | |
| Button styles | Consistent styling | ☐ Pass ☐ Fail | |
| Icons | Clear and intuitive | ☐ Pass ☐ Fail | |
| Spacing | Proper padding/margins | ☐ Pass ☐ Fail | |

---

### 6.2 Accessibility
**Device:** Device 1  
**Priority:** Low

| Feature | Check | Pass/Fail | Notes |
|---------|-------|-----------|-------|
| Text contrast | Readable against backgrounds | ☐ Pass ☐ Fail | Welcome text white: ☐ Yes |
| Touch targets | Minimum 48x48dp | ☐ Pass ☐ Fail | |
| Error messages | Clear and actionable | ☐ Pass ☐ Fail | |
| Loading states | Visible indicators | ☐ Pass ☐ Fail | |

---

### 6.3 Scrollability (FIXED)
**Device:** Both  
**Priority:** Medium

| Screen | Check | Pass/Fail | Notes |
|--------|-------|-----------|-------|
| Emergency screen | "How SOS Works" fully visible when scrolling | ☐ Pass ☐ Fail | |
| Nearby alerts | List scrolls smoothly with many alerts | ☐ Pass ☐ Fail | |
| Alert history | Long list scrollable | ☐ Pass ☐ Fail | |
| Profile | All fields accessible | ☐ Pass ☐ Fail | |

**Bug Context:**
- Previous issue: Emergency screen not scrollable, content hidden
- Fix: Wrapped in SingleChildScrollView, removed Spacer widgets
- Verification: All content should be reachable by scrolling

---

## TEST SECTION 7: Security & Data Privacy

### 7.1 Authentication Security
**Device:** Both  
**Priority:** Critical

| Test | Check | Pass/Fail | Notes |
|------|-------|-----------|-------|
| Password stored | Never stored in plaintext | ☐ Pass ☐ Fail | |
| Firebase tokens | Securely managed | ☐ Pass ☐ Fail | |
| API requests | Include Bearer token | ☐ Pass ☐ Fail | |
| Logout | Clears all auth data | ☐ Pass ☐ Fail | |

---

### 7.2 Data Exposure
**Device:** Desktop  
**Priority:** High

| Test | Check | Pass/Fail | Notes |
|------|-------|-----------|-------|
| API responses | No sensitive data leaked | ☐ Pass ☐ Fail | |
| Backend logs | No passwords logged | ☐ Pass ☐ Fail | |
| Database | Proper access controls | ☐ Pass ☐ Fail | |
| FCM tokens | Not exposed in responses | ☐ Pass ☐ Fail | |

---

### 7.3 Location Privacy
**Device:** Both  
**Priority:** High

| Test | Check | Pass/Fail | Notes |
|------|-------|-----------|-------|
| Location sharing | Only when explicitly enabled | ☐ Pass ☐ Fail | |
| Exact coordinates | Not shown to other users in UI | ☐ Pass ☐ Fail | |
| Location toggle | Immediately stops tracking when disabled | ☐ Pass ☐ Fail | |
| Historical data | Old locations not retained unnecessarily | ☐ Pass ☐ Fail | |

---

## TEST SECTION 8: Integration Tests

### 8.1 End-to-End Emergency Flow
**Device:** Both  
**Priority:** Critical

This is the complete happy path test:

| Step | Device | Action | Expected Result | Pass/Fail | Time |
|------|--------|--------|----------------|-----------|------|
| 1 | D1 | Login as trytry@gmail.com | Logged in successfully | ☐ Pass ☐ Fail | _____ sec |
| 2 | D2 | Login as aman-jhootdeva@gmail.com | Logged in successfully | ☐ Pass ☐ Fail | _____ sec |
| 3 | D1 | Enable location services | Location tracking active | ☐ Pass ☐ Fail | _____ sec |
| 4 | D2 | Enable location services | Location tracking active | ☐ Pass ☐ Fail | _____ sec |
| 5 | Admin | Verify both users | Both users verified | ☐ Pass ☐ Fail | _____ sec |
| 6 | D1 | Navigate to Emergency screen | Emergency screen displayed | ☐ Pass ☐ Fail | _____ sec |
| 7 | D1 | Tap SOS button and confirm | Alert created, cooldown starts | ☐ Pass ☐ Fail | _____ sec |
| 8 | D2 | Receive notification | Notification received | ☐ Pass ☐ Fail | _____ sec |
| 9 | D2 | Tap notification | Opens to nearby alerts | ☐ Pass ☐ Fail | _____ sec |
| 10 | D2 | View alert details | Shows correct location, name, message | ☐ Pass ☐ Fail | _____ sec |
| 11 | D2 | Tap "Directions" | Google Maps opens | ☐ Pass ☐ Fail | _____ sec |
| 12 | D2 | Return to app, tap "Respond" | Confirmation dialog shown | ☐ Pass ☐ Fail | _____ sec |
| 13 | D2 | Confirm response | Response sent successfully | ☐ Pass ☐ Fail | _____ sec |
| 14 | D1 | Receive response notification | Notification received | ☐ Pass ☐ Fail | _____ sec |
| 15 | D1 | Tap "Mark Resolved" | Alert marked as resolved | ☐ Pass ☐ Fail | _____ sec |
| 16 | D2 | Refresh nearby alerts | Alert removed from list | ☐ Pass ☐ Fail | _____ sec |
| 17 | D1 | View alert history | Resolved alert shown in history | ☐ Pass ☐ Fail | _____ sec |

**Total Flow Duration:** _______ minutes

**Success Criteria:**
- ☐ All steps pass without errors
- ☐ Total duration < 5 minutes
- ☐ No app crashes
- ☐ All notifications received
- ☐ Data consistent across devices

---

## TEST SECTION 9: Backend API Testing

### 9.1 Health Check Endpoint
```bash
curl http://192.168.8.70:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-06T...",
  "database": "connected",
  "firebase": "initialized"
}
```

**Result:** ☐ Pass ☐ Fail

---

### 9.2 API Documentation
```bash
curl http://192.168.8.70:3000/api/docs
```

**Expected:** Returns API documentation JSON  
**Result:** ☐ Pass ☐ Fail

---

### 9.3 Emergency Alert API

#### Create Alert
```bash
curl -X POST http://192.168.8.70:3000/api/emergency/alerts \
  -H "Authorization: Bearer {FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 53.350140,
    "longitude": -6.266155,
    "message": "Test emergency alert"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "alert": {
    "id": "uuid",
    "status": "active",
    "latitude": 53.350140,
    "longitude": -6.266155
  },
  "nearby_users_notified": 1
}
```

**Result:** ☐ Pass ☐ Fail  
**Alert ID:** _____________

---

#### Get Nearby Alerts
```bash
curl -X GET "http://192.168.8.70:3000/api/emergency/alerts?type=nearby" \
  -H "Authorization: Bearer {FIREBASE_TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "id": "uuid",
      "status": "active",
      "responder_count": 0
    }
  ],
  "count": 1
}
```

**Result:** ☐ Pass ☐ Fail

---

#### Respond to Alert
```bash
curl -X PUT http://192.168.8.70:3000/api/emergency/alerts/{ALERT_ID}/respond \
  -H "Authorization: Bearer {FIREBASE_TOKEN}" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "alert": {
    "id": "uuid",
    "status": "responded",
    "responder_count": 1
  },
  "message": "Response recorded successfully"
}
```

**Result:** ☐ Pass ☐ Fail

---

#### Update Alert Status
```bash
curl -X PATCH http://192.168.8.70:3000/api/emergency/alerts/{ALERT_ID} \
  -H "Authorization: Bearer {FIREBASE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved"}'
```

**Expected Response:**
```json
{
  "success": true,
  "alert": {
    "status": "resolved",
    "resolved_at": "2025-12-06T..."
  },
  "message": "Alert marked as resolved"
}
```

**Result:** ☐ Pass ☐ Fail

---

## TEST SECTION 10: Database Integrity

### 10.1 Users Table
```sql
SELECT 
  email, 
  full_name, 
  verification_status, 
  location_enabled,
  fcm_token IS NOT NULL as has_fcm_token,
  last_latitude,
  last_longitude,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;
```

**Checks:**
- ☐ All test users present
- ☐ FCM tokens stored
- ☐ Location coordinates updated
- ☐ Verification status correct

---

### 10.2 Emergency Alerts Table
```sql
SELECT 
  id,
  user_id,
  status,
  latitude,
  longitude,
  responder_count,
  created_at,
  resolved_at
FROM emergency_alerts
ORDER BY created_at DESC
LIMIT 10;
```

**Checks:**
- ☐ Alerts created with correct status
- ☐ Coordinates stored accurately
- ☐ Responder count increments correctly
- ☐ Resolved_at timestamp set when resolved

---

### 10.3 Alert Responses Table
```sql
SELECT 
  ar.id,
  ar.alert_id,
  ar.responder_id,
  ar.responded_at,
  u.email as responder_email,
  ea.status as alert_status
FROM alert_responses ar
JOIN users u ON ar.responder_id = u.id
JOIN emergency_alerts ea ON ar.alert_id = ea.id
ORDER BY ar.responded_at DESC
LIMIT 10;
```

**Checks:**
- ☐ Responses recorded correctly
- ☐ Unique constraint enforced (no duplicates)
- ☐ Foreign keys valid
- ☐ Timestamps accurate

---

### 10.4 Data Consistency
```sql
-- Verify responder_count matches actual responses
SELECT 
  ea.id,
  ea.responder_count,
  COUNT(ar.id) as actual_responses
FROM emergency_alerts ea
LEFT JOIN alert_responses ar ON ea.id = ar.alert_id
GROUP BY ea.id, ea.responder_count
HAVING ea.responder_count != COUNT(ar.id);
```

**Expected:** No rows (counts should match)  
**Result:** ☐ Pass ☐ Fail

---

## POST-TEST VERIFICATION

### Backend Logs Review
- [ ] No unexpected errors in logs
- [ ] All notifications logged correctly
- [ ] Distance calculations accurate
- [ ] No memory leaks reported

### Database Cleanup
- [ ] Test data identified
- [ ] Option to delete test alerts
- [ ] User accounts status verified

### Issue Tracking
**Issues Found:** _______

| # | Issue Description | Severity | Status |
|---|-------------------|----------|--------|
| 1 |  | ☐ Critical ☐ High ☐ Medium ☐ Low | ☐ Open ☐ Fixed |
| 2 |  | ☐ Critical ☐ High ☐ Medium ☐ Low | ☐ Open ☐ Fixed |
| 3 |  | ☐ Critical ☐ High ☐ Medium ☐ Low | ☐ Open ☐ Fixed |

---

## SUMMARY

### Overall Results

**Total Tests:** _______  
**Passed:** _______  
**Failed:** _______  
**Pass Rate:** _______ %

### Critical Issues
1. _______________________________________
2. _______________________________________
3. _______________________________________

### Recommendations
1. _______________________________________
2. _______________________________________
3. _______________________________________

### Sign-off

**Tester Signature:** _____________  
**Date:** _____________  
**Status:** ☐ APPROVED ☐ REJECTED ☐ CONDITIONAL APPROVAL

---

## APPENDIX

### A. Test Environment Details
- Android Version: _______
- Device Models: _______
- Network Type: _______
- Backend Version: _______
- Database Version: _______

### B. Known Limitations
1. _______________________________________
2. _______________________________________

### C. Future Test Cases
1. _______________________________________
2. _______________________________________

---

**End of Test Script**
