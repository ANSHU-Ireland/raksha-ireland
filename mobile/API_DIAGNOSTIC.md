# API Networking Diagnostic Report
**Raksha Ireland Mobile App - iOS**  
**Date**: 8 December 2025  
**Issue**: API Connection Test Failing

---

## 🔍 Problem Summary

The mobile app is failing to connect to the backend API with error:
```
ERROR: API Connection Test Failed: Network Error
LOG: API Connection: {"message": "API not available", "status": "error"}
```

---

## 📊 Current Configuration Analysis

### 1. **Environment Variables** (.env)
```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_AWS_REGION=eu-west-1
EXPO_PUBLIC_APP_NAME=RAKSHA Ireland
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_DEBUG_MODE=true
```

**Status**: ✅ File exists and is being loaded correctly
**Evidence**: Build output shows `env: load .env`

### 2. **API Client Configuration** (src/api/aws.js)

**Base URL Resolution**:
```javascript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api-gateway-url.amazonaws.com';
```
- Currently resolving to: `http://localhost:3000`
- Timeout: 10000ms (10 seconds)
- Headers: Content-Type: application/json

**Test Endpoint**:
```javascript
export const testConnection = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('API Connection Test Failed:', error.message);
    return { status: 'error', message: 'API not available' };
  }
};
```

**Full URL being called**: `http://localhost:3000/health`

---

## ❌ Root Cause Analysis

### **Primary Issue: No Backend Server Running**

The app is trying to connect to `localhost:3000`, but there is:
1. ❌ No local backend server running on port 3000
2. ❌ Backend is AWS Lambda-based (serverless), not a local Express server
3. ❌ API Gateway endpoint not yet deployed

### **iOS Simulator Networking Context**

When running in iOS Simulator:
- ✅ `localhost` refers to the Mac host machine (correct)
- ✅ Simulator can reach host's localhost services
- ❌ But there's no service listening on port 3000

---

## 🎯 Solution Options

### **Option 1: Deploy Backend to AWS** ⭐ RECOMMENDED for Production

**Steps**:
1. Navigate to backend directory:
   ```bash
   cd /Users/areiva/Desktop/Raksha/raksha-ireland/backend
   ```

2. Review backend setup:
   - Backend uses AWS Lambda functions
   - Requires AWS account and credentials
   - Functions: signup, login, approveUser, activateUser, sosTrigger, health

3. Deploy to AWS:
   ```bash
   # Review README for deployment steps
   cat README.md
   
   # Deploy script available
   ./deploy.sh  # or deploy.ps1 for Windows
   ```

4. Get API Gateway URL after deployment:
   - Format: `https://xxxxxxxx.execute-api.eu-west-1.amazonaws.com/prod`

5. Update mobile/.env:
   ```bash
   EXPO_PUBLIC_API_URL=https://your-actual-api-gateway-url.execute-api.eu-west-1.amazonaws.com/prod
   ```

6. Rebuild app:
   ```bash
   cd ../mobile
   npx expo run:ios
   ```

**Pros**: Production-ready, scalable, proper architecture
**Cons**: Requires AWS account, some cost, deployment complexity

---

### **Option 2: Create Local Mock Server** ⭐ RECOMMENDED for Development

Create a simple local Express server for testing:

**File**: `backend/local-server.js`
```javascript
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Raksha Ireland API - Local Development',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mock signup
app.post('/signup', (req, res) => {
  console.log('Signup request:', req.body);
  res.json({
    success: true,
    message: 'User registered successfully',
    userId: 'mock-user-' + Date.now(),
    status: 'pending'
  });
});

// Mock login
app.post('/login', (req, res) => {
  console.log('Login request:', req.body);
  res.json({
    success: true,
    token: 'mock-jwt-token-' + Date.now(),
    user: {
      email: req.body.email,
      name: 'Test User',
      status: 'activated'
    }
  });
});

// Mock SOS
app.post('/sos', (req, res) => {
  console.log('SOS Alert:', req.body);
  res.json({
    success: true,
    alertId: 'alert-' + Date.now(),
    message: 'Emergency alert sent successfully',
    notifiedUsers: 5
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Raksha Ireland Mock API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
```

**Setup**:
```bash
cd /Users/areiva/Desktop/Raksha/raksha-ireland/backend
npm install express cors
node local-server.js
```

**Pros**: Quick testing, no AWS needed, fast iteration
**Cons**: Not production-ready, limited functionality

---

### **Option 3: Disable API Connection Test** (Quick Fix)

Update `App.js` to skip the connection test:

```javascript
const initializeApp = async () => {
  try {
    // Skip API test in development
    if (process.env.EXPO_PUBLIC_DEBUG_MODE === 'true') {
      console.log('API Connection: Skipped in debug mode');
    } else {
      const connectionTest = await testConnection();
      console.log('API Connection:', connectionTest);
    }
    
  } catch (error) {
    console.log('App initialization warning:', error.message);
  } finally {
    setIsReady(true);
  }
};
```

**Pros**: App starts without errors, immediate fix
**Cons**: Doesn't solve actual API problem, features won't work

---

## 🔧 Quick Testing Commands

### Check if anything is on port 3000:
```bash
lsof -i :3000
# Should return nothing if port is free
```

### Test backend deployment status:
```bash
cd /Users/areiva/Desktop/Raksha/raksha-ireland/backend
cat README.md | grep -A 10 "Deploy"
```

### Check AWS credentials (if deploying):
```bash
aws configure list
# or
cat ~/.aws/credentials
```

---

## 📝 Detailed Error Flow

1. **App Starts** → `App.js` → `initializeApp()`
2. **Calls** → `testConnection()` from `src/api/aws.js`
3. **Makes Request** → `GET http://localhost:3000/health`
4. **Axios Timeout** → 10 seconds waiting for response
5. **No Response** → Connection refused (nothing listening)
6. **Error Caught** → Returns `{ status: 'error', message: 'API not available' }`
7. **Console Output** → "API Connection Test Failed: Network Error"

**Network Error Types**:
- `ECONNREFUSED` - Port not listening
- `ETIMEDOUT` - Request timeout (10s)
- `Network Error` - Generic Axios network failure

---

## ✅ Recommended Action Plan

### **For Immediate Testing**:
1. Create local mock server (Option 2)
2. Run `node local-server.js` in backend directory
3. Keep mobile app as-is
4. Test app functionality

### **For Production Deployment**:
1. Set up AWS account
2. Configure AWS credentials
3. Deploy backend Lambda functions
4. Get API Gateway URL
5. Update mobile/.env with production URL
6. Rebuild and test

### **For Development Without Backend**:
1. Modify App.js to skip connection test
2. Add mock data in screens
3. Test UI/UX without real API
4. Integrate later when backend is ready

---

## 🎓 Why This Is Happening

- ✅ Mobile app is correctly configured
- ✅ Environment variables are loading properly
- ✅ API client is set up correctly
- ❌ **Backend service doesn't exist yet**

This is **expected behavior** when:
- Backend hasn't been deployed to AWS
- No local development server is running
- Testing frontend independently

---

## 📞 Next Steps

**Choose your path**:

1. **Want to deploy to AWS?** → Follow backend README deployment guide
2. **Want local testing?** → Create mock server (code above)
3. **Just testing UI?** → Disable API test, use mock data

All approaches are valid depending on your current development phase!
