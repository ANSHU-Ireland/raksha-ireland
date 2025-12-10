# Mock API Server - Quick Start Guide

## 🎯 Purpose
This mock server allows you to test the Raksha Ireland mobile app without deploying to AWS.

## 🚀 Quick Start

### Option 1: Using the Startup Script (Recommended)
```bash
cd /Users/areiva/Desktop/Raksha/raksha-ireland/backend
./start-mock-server.sh
```

### Option 2: Manual Setup
```bash
cd /Users/areiva/Desktop/Raksha/raksha-ireland/backend
npm install express cors --save-dev
node local-mock-server.js
```

## ✅ Verify It's Running

The server should display:
```
🚀 Raksha Ireland Mock API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server running on: http://localhost:3000
🏥 Health check: http://localhost:3000/health
```

Test in your browser or terminal:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Raksha Ireland API - Local Development Mock Server",
  "timestamp": "2025-12-08T...",
  "version": "1.0.0"
}
```

## 📱 Testing with Mobile App

1. **Keep the mock server running** in one terminal
2. **In another terminal**, rebuild the mobile app:
   ```bash
   cd /Users/areiva/Desktop/Raksha/raksha-ireland/mobile
   npx expo run:ios
   ```

3. **Watch the server logs** - you'll see requests coming in:
   ```
   ✅ Health check requested
   📝 Signup request: {...}
   🔐 Login request for: test@example.com
   🆘 SOS Alert received: {...}
   ```

## 🔧 Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health check |
| POST | `/signup` | User registration (mock) |
| POST | `/login` | User authentication (mock) |
| POST | `/sos` | Emergency SOS alert (mock) |
| POST | `/approve-user` | Approve user (admin mock) |
| POST | `/register-push-token` | Register push notification token |

## 🎭 Mock Behavior

- **All requests succeed** (no real validation)
- **Returns realistic JSON responses**
- **Logs all requests to console**
- **Generates random IDs and timestamps**

## 🛑 Stopping the Server

Press `Ctrl+C` in the terminal running the server.

## ⚠️ Important Notes

- This is for **development/testing only**
- Data is **not persisted** (memory only)
- No real authentication or security
- Restart required to clear state

## 🔄 Mobile App Configuration

Your mobile app is already configured correctly:
```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

The iOS Simulator can access `localhost:3000` on your Mac.

## ✅ Success Indicators

When working correctly, you should see:

**In Server Terminal:**
```
✅ Health check requested
📝 Signup request: { name: "John", email: "john@example.com", ... }
```

**In Mobile App:**
```
✅ API Connection: { status: "ok", message: "..." }
(No more "Network Error")
```

## 🚀 Next Steps

Once the backend is deployed to AWS:
1. Stop this mock server
2. Update `mobile/.env` with real API Gateway URL
3. Rebuild the mobile app
4. Test with real AWS services
