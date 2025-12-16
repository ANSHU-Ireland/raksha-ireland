```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Raksha Ireland - Unified Architecture                     │
│                         iOS ↔ Android Cross-Platform                         │
└──────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────┐
                          │  Mobile App     │
                          │  (iOS/Android)  │
                          │  React Native   │
                          └────────┬────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                ▼                  ▼                  ▼
         ┌──────────┐       ┌──────────┐      ┌──────────┐
         │  Signup  │       │   SOS    │      │ Profile  │
         │  /signup │       │   Alert  │      │ /profile │
         └──────────┘       └────┬─────┘      └──────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
            ┌───────────────┐         ┌──────────────┐
            │  Backend REST │         │   Supabase   │
            │  /sos         │────────▶│    Direct    │
            │  EC2:3000     │         │   Insert     │
            └───────┬───────┘         └──────┬───────┘
                    │                        │
                    └────────────┬───────────┘
                                 ▼
                    ┌────────────────────────┐
                    │   Supabase Database    │
                    │  emergency_alerts      │
                    │  (14 columns)          │
                    └────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         Unified Alert Payload Schema                         │
└──────────────────────────────────────────────────────────────────────────────┘

{
  user_id:        "uuid"              ← User creating alert
  latitude:       53.3498             ← GPS coordinates
  longitude:      -6.2603             
  message:        "Emergency..."      ← Alert message
  radius_meters:  3000                ← ✨ NEW: Broadcast radius
  h3_index:       "8c1965d8a242fff"   ← ✨ NEW: Geospatial index
  name:           "John Doe"          ← ✨ NEW: User name
  phone:          "+353871234567"     ← ✨ NEW: Contact phone
  status:         "active"            ← active/resolved
  responder_count: 0                  ← # of responders
  created_at:     "2025-12-11..."     ← Timestamp
}

┌──────────────────────────────────────────────────────────────────────────────┐
│                          Cross-Platform Alert Flow                           │
└──────────────────────────────────────────────────────────────────────────────┘

[iOS User - Dublin]                      [Android User - Cork]
        │                                          │
        │ 1. Hold SOS button (3s)                 │
        ▼                                          │
  sendSOSAlert()                                   │
        │                                          │
        │ 2. POST to Supabase                     │
        ▼                                          │
  emergency_alerts.insert()                        │
        │                                          │
        │ 3. Record saved                         │
        │    (all 14 fields)                      │
        │                                          │
        │                                          │ 4. User opens app
        │                                          ▼
        │                                   getAlertHistory()
        │                                          │
        │                                          │ 5. Fetch from Supabase
        │                                          ▼
        │                            emergency_alerts.select()
        │                                          │
        │                                          │ 6. iOS alert appears!
        │◀─────────────────────────────────────────┤
                    Cross-platform ✓

┌──────────────────────────────────────────────────────────────────────────────┐
│                           Implementation Status                              │
└──────────────────────────────────────────────────────────────────────────────┘

✅ Backend API Updated
   • /sos endpoint accepts all Android fields
   • /test-alert-notification includes full payload
   • /alert-history returns complete records

✅ Mobile Supabase API Updated
   • sendSOSAlertSupabase() includes radius_meters, h3_index, name, phone
   • Extracts user info from session automatically
   • Respects custom values from sosData

✅ Documentation Created
   • API-UNIFICATION-PLAN.md (14 sections)
   • IMPLEMENTATION-SUMMARY.md (troubleshooting)
   • QUICK-START.md (fast deployment)
   • supabase-add-columns.sql (DB migration)
   • deploy-to-ec2.sh (automated deployment)

✅ Feature Gap Analysis
   • No iOS-specific gaps found
   • Both platforms share same React Native codebase
   • Only schema alignment needed (DB migration)

⚠️  Pending: Supabase Schema Migration
   • 4 columns need to be added to emergency_alerts table
   • Migration SQL ready in supabase-add-columns.sql
   • Execute in Supabase SQL Editor → Run → Complete!

┌──────────────────────────────────────────────────────────────────────────────┐
│                          Deployment Sequence                                 │
└──────────────────────────────────────────────────────────────────────────────┘

Step 1: Execute Supabase Migration ⚡
   → Open Supabase Dashboard → SQL Editor
   → Run: supabase-add-columns.sql
   → Verify: 4 new columns + 2 indexes created

Step 2: Test Local Backend
   → Backend already running on localhost:3000
   → Test: curl POST /test-alert-notification
   → Expect: {"success":true} with all fields

Step 3: Deploy to EC2
   → Run: ./deploy-to-ec2.sh
   → Script handles: backup, deploy, restart, health check
   → Verify: EC2 endpoint test passes

Step 4: Rebuild Mobile Apps
   → Run: npm start in /mobile
   → Test iOS: Create alert → Check Supabase
   → Test Android: View alert history → Verify iOS alert appears
   → Confirm: Cross-platform ✓

┌──────────────────────────────────────────────────────────────────────────────┐
│                         Backend API Endpoints (14)                           │
└──────────────────────────────────────────────────────────────────────────────┘

Authentication:
  POST   /signup                User registration
  POST   /login                 User authentication

Emergency:
  POST   /sos                   Emergency SOS alert ⭐ UPDATED
  GET    /alert-history         Get alert history
  POST   /test-alert-notification  Test alert endpoint ⭐ UPDATED
  GET    /nearby-users/:h3      Get users in H3 cell

User Management:
  GET    /profile               Get user profile
  PUT    /profile               Update user profile
  POST   /update-location       Update GPS location
  POST   /register-push-token   Register FCM/APNS token

Admin:
  GET    /admin/users           Get all users
  POST   /approve-user          Approve user
  POST   /reject-user           Reject user

System:
  GET    /health                Health check

┌──────────────────────────────────────────────────────────────────────────────┐
│                      Files Created/Modified Summary                          │
└──────────────────────────────────────────────────────────────────────────────┘

Modified:
  ✏️  backend/local-mock-server.js        (lines 227-237, 468-480)
  ✏️  mobile/src/api/supabaseApi.js       (lines 45-80)

Created:
  📄 API-UNIFICATION-PLAN.md              (14 sections, 600+ lines)
  📄 IMPLEMENTATION-SUMMARY.md            (Quick reference guide)
  📄 QUICK-START.md                       (Fast deployment path)
  📄 supabase-add-columns.sql             (DB migration SQL)
  📄 deploy-to-ec2.sh                     (Deployment automation)
  📄 ARCHITECTURE.md                      (This visualization)

┌──────────────────────────────────────────────────────────────────────────────┐
│                           Success Criteria                                   │
└──────────────────────────────────────────────────────────────────────────────┘

✅ When Complete:

1. Supabase emergency_alerts table has 14 columns:
   id, user_id, latitude, longitude, message, status, responder_count,
   resolved_at, created_at, updated_at, radius_meters, name, phone, h3_index

2. Backend /sos accepts full payload without schema errors

3. Mobile app SOS creates alerts with all fields populated

4. iOS alerts visible on Android devices (and vice versa)

5. Alert history displays complete information (name, phone, radius)

6. No "column not found" errors in backend/Supabase logs

┌──────────────────────────────────────────────────────────────────────────────┐
│                          Quick Commands                                      │
└──────────────────────────────────────────────────────────────────────────────┘

Local Test:
  curl -X POST http://localhost:3000/test-alert-notification \
    -H "Content-Type: application/json" \
    -d '{"message":"Test","latitude":53.3498,"longitude":-6.2603,"radius_meters":3000}' | jq .

Deploy to EC2:
  ./deploy-to-ec2.sh

Check EC2 Logs:
  ssh ubuntu@ec2-3-254-75-134.eu-west-1.compute.amazonaws.com "pm2 logs raksha-backend --lines 50"

Rebuild Mobile:
  cd mobile && npm start

Verify Supabase Schema:
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'emergency_alerts' ORDER BY ordinal_position;

┌──────────────────────────────────────────────────────────────────────────────┐
│                    🎉 Ready to Deploy! 🎉                                   │
│                                                                              │
│  Next Step: Execute Supabase migration → Test → Deploy to EC2              │
└──────────────────────────────────────────────────────────────────────────────┘
```
