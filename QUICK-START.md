# 🚀 Quick Start Guide - iOS/Android API Unification

## ⚡ What Was Done

✅ **Backend updated** - `/sos` endpoint now accepts all Android fields: `radius_meters`, `name`, `phone`, `h3_index`  
✅ **Mobile updated** - `supabaseApi.js` now includes all fields when creating alerts  
✅ **Docs created** - Complete API spec, deployment scripts, migration SQL  
✅ **No iOS gaps found** - iOS/Android share same codebase, already unified!

---

## 🎯 What You Need to Do

### Step 1: Execute Supabase Migration (CRITICAL)

Open Supabase Dashboard → SQL Editor → Paste this:

```sql
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 3000;
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE emergency_alerts ADD COLUMN IF NOT EXISTS h3_index TEXT;

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_h3_index ON emergency_alerts(h3_index);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_radius ON emergency_alerts(radius_meters);
```

Click "Run" → Verify success → Move to Step 2

---

### Step 2: Test Locally

```bash
# Backend is already running on localhost:3000
curl -X POST http://localhost:3000/test-alert-notification \
  -H "Content-Type: application/json" \
  -d '{"message":"Test","latitude":53.3498,"longitude":-6.2603,"radius_meters":3000,"name":"Test User","phone":"+353871234567","h3_index":"8c1965d8a242fff"}' | jq .
```

**Expected:** `{"success":true,...}` with all fields in response

---

### Step 3: Deploy to EC2

```bash
/Users/areiva/Desktop/Raksha/raksha-ireland/deploy-to-ec2.sh
```

This will:
- Deploy updated backend code
- Restart PM2 process
- Run health checks
- Test alert endpoint
- Show deployment status

---

### Step 4: Test Mobile Apps

```bash
cd /Users/areiva/Desktop/Raksha/raksha-ireland/mobile
npm start
```

**iOS:**
1. Open app → Login → Hold SOS (3s)
2. Check Supabase table has all fields

**Android:**
1. Open app → Login → View Alert History
2. Verify iOS alert appears

**Cross-platform verification:** ✅

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `API-UNIFICATION-PLAN.md` | Complete technical spec (14 sections) |
| `IMPLEMENTATION-SUMMARY.md` | What was done + troubleshooting |
| `QUICK-START.md` | This file (fast path to deployment) |
| `supabase-add-columns.sql` | Database migration SQL |
| `deploy-to-ec2.sh` | Automated EC2 deployment |

---

## ✅ Success Checklist

- [ ] Supabase migration executed (4 columns added)
- [ ] Local test passes with all fields
- [ ] EC2 deployment successful
- [ ] iOS alert created with full payload
- [ ] Android sees iOS alert (cross-platform ✓)
- [ ] iOS sees Android alert (cross-platform ✓)

---

## 🆘 Quick Troubleshooting

**Error: "Could not find the 'h3_index' column"**  
→ Run Supabase migration (Step 1)

**Backend won't start on EC2**  
→ Check logs: `ssh ubuntu@ec2-3-254-75-134.eu-west-1.compute.amazonaws.com "pm2 logs raksha-backend"`

**Alerts not cross-platform**  
→ Login with same user on both devices

---

## 🎉 When Complete

Both iOS and Android will:
- Send identical alert payloads
- Store all fields in Supabase
- Display complete alert information
- Show cross-platform alerts in real-time

**No feature gaps between platforms!** 🚀
