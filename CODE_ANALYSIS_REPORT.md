# Code Analysis Report - Raksha Ireland
**Date:** December 6, 2025

## Changes Made - Proof of Work

### 1. ✅ Nearby Alerts Disappearing Fix
**File:** `mobile-app/lib/features/emergency/providers/emergency_provider.dart`
**Lines:** 675-690

**Problem:** Alerts disappeared after 2-3 refreshes because errors cleared the `_nearbyAlerts` array.

**Old Code:**
```dart
} else {
  _nearbyAlerts = [];  // ❌ CLEARED ALERTS
  notifyListeners();
}
```

**New Code:**
```dart
} else {
  if (kDebugMode) {
    print('❌ Failed to load nearby alerts: ${response.statusCode}');
    print('   Response: ${response.body}');
  }
  // ✅ Keep existing alerts on error, don't clear them
  if (kDebugMode) {
    print('⚠️ Keeping ${_nearbyAlerts.length} cached alerts');
  }
}
```

**Impact:** Alerts now persist even when refresh fails, preventing the disappearing issue.

---

### 2. ✅ Backend PATCH Endpoint Enhanced Logging
**File:** `backend/src/routes/emergency.js`
**Lines:** 250-295

**Problem:** No visibility into why mark resolve was failing.

**Added Logging:**
- ✅ Request received with user ID and alert ID
- ✅ Alert existence check with detailed feedback
- ✅ Ownership verification (user.id vs alert.user_id)
- ✅ Success/failure logging with specific error reasons

**New Features:**
```javascript
console.log(`[PATCH /alerts/:id] 📥 Request from user ${user.id} to update alert ${id} to status: ${status}`);

// Check if alert exists first
const existingAlert = await db('emergency_alerts').where('id', id).first();
if (!existingAlert) {
  console.log(`[PATCH /alerts/:id] ❌ Alert ${id} not found in database`);
  return res.status(404).json({ error: 'Alert not found' });
}

// Check ownership
if (existingAlert.user_id !== user.id) {
  console.log(`[PATCH /alerts/:id] ❌ User ${user.id} does not own alert ${id} (owner: ${existingAlert.user_id})`);
  return res.status(403).json({ error: 'You can only update your own alerts' });
}
```

**Impact:** Now we can see exactly why resolve fails (404, 403, or validation error).

---

### 3. ✅ Firebase Storage Integration for Real Image Upload
**File:** `mobile-app/lib/features/profile/profile_screen.dart`
**Lines:** 1-10, 140-210

**Problem:** Profile pictures used placeholder URL instead of real uploads.

**Changes:**
1. Added Firebase Storage import: `import 'package:firebase_storage/firebase_storage.dart';`
2. Updated `pubspec.yaml` with `firebase_storage: ^13.0.5`
3. Replaced placeholder upload with real Firebase Storage upload

**New Implementation:**
```dart
// Create reference to Firebase Storage
final storageRef = FirebaseStorage.instance
    .ref()
    .child('profile_pictures')
    .child('${user.uid}_${DateTime.now().millisecondsSinceEpoch}.jpg');

// Upload file
final File imageFile = File(image.path);
final UploadTask uploadTask = storageRef.putFile(imageFile);
final TaskSnapshot snapshot = await uploadTask;

// Get download URL
final String imageUrl = await snapshot.ref.getDownloadURL();
```

**Impact:** Real image uploads to Firebase Storage with public URLs saved to database.

---

## Deep Code Scan - Issues Found

### 🔴 CRITICAL ISSUE #1: Redundant notifyListeners() Calls
**File:** `emergency_provider.dart`
**Lines:** 615, 626, 693

**Problem:**
```dart
_setLoading(false);  // Calls notifyListeners() internally
notifyListeners();   // 🔴 REDUNDANT CALL
```

**Why It's Bad:**
- Causes unnecessary widget rebuilds
- Performance impact on every refresh
- Potential race conditions in state updates

**Locations:**
1. Line 615-616: After clearing alerts on auth failure
2. Line 626-627: After clearing alerts on token failure  
3. Line 692-693: In finally block after _setLoading(false)

**Fix Needed:** Remove redundant `notifyListeners()` calls after `_setLoading(false)`.

---

### ⚠️ MEDIUM ISSUE #2: context.read() in initState
**File:** `nearby_alerts_screen.dart`
**Line:** 37

**Code:**
```dart
Future<void> _loadAlerts() async {
  final provider = context.read<EmergencyProvider>();  // ⚠️ Potentially unsafe
  await provider.loadNearbyAlerts();
}
```

**Why It's Risky:**
- `context.read()` in initState can cause issues if Provider not yet available
- Better to use mounted check or WidgetsBinding.instance.addPostFrameCallback

**Recommended Fix:**
```dart
@override
void initState() {
  super.initState();
  WidgetsBinding.instance.addPostFrameCallback((_) {
    _loadAlerts();
  });
}
```

---

### ⚠️ MEDIUM ISSUE #3: Early Returns Still Call setLoading(false)
**File:** `emergency_provider.dart`
**Lines:** 614-616, 625-627

**Code:**
```dart
if (user == null) {
  _nearbyAlerts = [];
  _setLoading(false);  // ⚠️ Manually called
  notifyListeners();   // ⚠️ Redundant
  return;
}
```

**Problem:**
- Early returns manually call `_setLoading(false)` AND `notifyListeners()`
- Finally block also calls `_setLoading(false)` which calls `notifyListeners()` again
- Results in double notification

**Fix:** Remove manual `_setLoading(false)` and `notifyListeners()` from early returns, let finally block handle it.

---

### ✅ GOOD: No Infinite Loops Found
- Scanned for `while(true)`, `for(;;)`, recursive calls
- All loops have proper exit conditions
- No circular dependencies detected

---

### ✅ GOOD: Proper Error Handling
- Try-catch blocks in all async operations
- Error messages set appropriately
- No unhandled promise rejections

---

### ✅ GOOD: State Management
- Single source of truth for alerts
- Proper use of Provider pattern
- No global mutable state

---

## Database Status

### ✅ Cleaned Up
- 56 old alerts marked as resolved
- 15 active alerts remaining for testing
- `profile_pic_url` column added to users table

### Current Active Alerts:
- **trytry@gmail.com:** 9 active alerts
- **newuser@gmail.com:** 6 active alerts
- All within last hour (good for testing)

---

## Recommended Fixes Before Rebuild

### Priority 1: Fix Redundant notifyListeners()
```dart
// CHANGE THIS:
_nearbyAlerts = [];
_setLoading(false);
notifyListeners();  // ❌ REMOVE THIS
return;

// TO THIS:
_nearbyAlerts = [];
return;  // Let finally block handle _setLoading(false)
```

### Priority 2: Remove duplicate notifyListeners in finally
```dart
// CHANGE THIS:
} finally {
  _setLoading(false);  // Already calls notifyListeners()
  notifyListeners();   // ❌ REMOVE THIS
}

// TO THIS:
} finally {
  _setLoading(false);
}
```

### Priority 3: Wrap initState context.read
```dart
@override
void initState() {
  super.initState();
  WidgetsBinding.instance.addPostFrameCallback((_) {
    _loadAlerts();
  });
}
```

---

## Summary

### ✅ Completed Changes (3/3):
1. Nearby alerts caching fix
2. Backend resolve logging
3. Firebase Storage integration

### 🔴 Critical Issues Found: 1
- Redundant notifyListeners() causing performance issues

### ⚠️ Medium Issues Found: 2
- Unsafe context.read() in initState
- Double notifications on early returns

### 📊 Code Quality: GOOD
- No infinite loops
- Proper error handling
- Good state management patterns

**Recommendation:** Fix the 3 issues before rebuilding to prevent performance degradation.
