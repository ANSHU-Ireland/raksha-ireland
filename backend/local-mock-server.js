const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// In-memory user storage for mock server
const users = new Map();
const alertHistory = [
  {
    alertId: 'alert-1',
    name: 'Sarah Murphy',
    phone: '+353 87 123 4567',
    location: { latitude: 53.3498, longitude: -6.2603 },
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    alertId: 'alert-2',
    name: 'David O\'Brien',
    phone: '+353 86 765 4321',
    location: { latitude: 53.3510, longitude: -6.2590 },
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
  },
  {
    alertId: 'alert-3',
    name: 'Emma Kelly',
    phone: '+353 85 987 6543',
    location: { latitude: 53.3475, longitude: -6.2615 },
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  }
];

app.use(cors());
app.use(express.json());

console.log('🚀 Starting Raksha Ireland Mock API Server...');

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({
    status: 'ok',
    message: 'Raksha Ireland API - Local Development Mock Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'development'
  });
});

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Mock signup endpoint
app.post('/signup', async (req, res) => {
  console.log('📝 Signup request:', req.body);
  
  // Simulate validation
  if (!req.body.email || !req.body.name) {
    return res.status(400).json({
      success: false,
      message: 'Email and name are required'
    });
  }
  if (!req.body.password || String(req.body.password).length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters'
    });
  }
  
  const userId = 'user-' + Date.now();
  const email = String(req.body.email).toLowerCase();

  // Prevent duplicate signup
  if (users.has(email)) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists'
    });
  }

  // Hash password
  let tempPasswordHash = null;
  try {
    const salt = await bcrypt.genSalt(10);
    tempPasswordHash = await bcrypt.hash(String(req.body.password), salt);
  } catch (hashErr) {
    console.error('Password hash error:', hashErr);
    return res.status(500).json({ success: false, message: 'Failed to process password' });
  }
  const userData = {
    userId,
    email,
    name: req.body.name,
    phone: req.body.phone,
    status: 'pending', // Wait for admin approval
    createdAt: new Date().toISOString(),
    tempPasswordHash,
  };
  
  // Store user data
  users.set(email, userData);
  
  res.json({
    success: true,
    message: 'User registered successfully. Pending admin approval.',
    userId: userData.userId,
    status: userData.status,
    data: {
      email,
      name: userData.name,
      phone: userData.phone
    }
  });
});

// Mock login endpoint
app.post('/login', async (req, res) => {
  console.log('🔐 Login request for:', req.body.email);
  console.log('📦 Stored users:', Array.from(users.keys()));
  
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password required'
    });
  }
  
  // Get stored user
  const email = String(req.body.email).toLowerCase();
  let userData = users.get(email);
  
  if (!userData) {
    // User not found - require signup first
    return res.status(401).json({
      success: false,
      message: 'User not found. Please sign up first.'
    });
  }

  // Enforce activation status
  if (userData.status !== 'activated') {
    let message = 'Account not activated';
    if (userData.status === 'pending') {
      message = 'Account pending admin approval';
    } else if (userData.status === 'approved') {
      message = 'Account approved but not activated.';
    } else if (userData.status === 'rejected') {
      message = 'Account registration was rejected.';
    }
    return res.status(403).json({
      success: false,
      message,
      status: userData.status,
    });
  }

  // Verify password
  try {
    const ok = await bcrypt.compare(String(req.body.password), userData.tempPasswordHash || '');
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (cmpErr) {
    console.error('Password compare error:', cmpErr);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
  
  // Mock successful login
  res.json({
    success: true,
    token: 'mock-jwt-token-' + Date.now(),
    user: userData
  });
});

// Mock SOS alert endpoint
app.post('/sos', (req, res) => {
  console.log('🆘 SOS Alert received:', {
    location: req.body.location,
    h3Index: req.body.h3Index,
    timestamp: req.body.timestamp
  });
  
  // Simulate alert data that would be sent in push notification
  const alertData = {
    alertId: 'alert-' + Date.now(),
    name: 'John Doe', // Simulated user who sent SOS
    phone: '+353 87 123 4567',
    location: req.body.location,
    timestamp: new Date().toISOString()
  };
  
  console.log('📱 Would send notification to nearby users with data:', alertData);
  
  res.json({
    success: true,
    alertId: alertData.alertId,
    message: 'Emergency alert sent successfully',
    notifiedUsers: Math.floor(Math.random() * 10) + 1,
    timestamp: alertData.timestamp
  });
});

// Admin endpoint - Get all users
app.get('/admin/users', (req, res) => {
  console.log('👥 Admin: Get all users request');
  
  const allUsers = Array.from(users.values());
  
  res.json({
    success: true,
    users: allUsers,
    count: allUsers.length
  });
});

// Mock user approval endpoint (admin)
app.post('/approve-user', (req, res) => {
  console.log('✅ User approval request:', req.body.userId);
  
  // Find and update user status
  let updatedUser = null;
  for (const [email, user] of users.entries()) {
    if (user.userId === req.body.userId) {
      user.status = 'activated';
      user.approvedAt = new Date().toISOString();
      users.set(email, user);
      updatedUser = user;
      break;
    }
  }
  
  if (!updatedUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  res.json({
    success: true,
    message: 'User approved and activation email sent',
    userId: req.body.userId,
    user: updatedUser
  });
});

// Mock user rejection endpoint (admin)
app.post('/reject-user', (req, res) => {
  console.log('❌ User rejection request:', req.body.userId);
  
  // Find and update user status
  let updatedUser = null;
  for (const [email, user] of users.entries()) {
    if (user.userId === req.body.userId) {
      user.status = 'rejected';
      user.rejectedAt = new Date().toISOString();
      users.set(email, user);
      updatedUser = user;
      break;
    }
  }
  
  if (!updatedUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  res.json({
    success: true,
    message: 'User registration rejected',
    userId: req.body.userId,
    user: updatedUser
  });
});

// Mock push token registration
app.post('/register-push-token', (req, res) => {
  console.log('📱 Push token registered:', req.body.pushToken?.substring(0, 20) + '...');
  
  res.json({
    success: true,
    message: 'Push notification token registered'
  });
});

// Mock location update endpoint
app.post('/update-location', (req, res) => {
  console.log('📍 Location update:', {
    lat: req.body.latitude?.toFixed(4),
    lng: req.body.longitude?.toFixed(4),
    accuracy: req.body.accuracy
  });
  
  res.json({
    success: true,
    message: 'Location updated successfully'
  });
});

// Mock user profile endpoint
app.get('/profile', (req, res) => {
  console.log('👤 Profile request');
  
  // Try to get user from authorization header or use first stored user
  const email = req.headers['x-user-email'] || Array.from(users.values())[0]?.email;
  let userData = email ? users.get(email) : null;
  
  if (!userData && users.size > 0) {
    userData = Array.from(users.values())[0];
  }
  
  if (!userData) {
    return res.status(404).json({
      success: false,
      message: 'User not found. Please login or sign up.'
    });
  }
  
  res.json({
    success: true,
    user: userData
  });
});

// Update user profile endpoint
app.put('/profile', (req, res) => {
  console.log('📝 Profile update request:', req.body);
  
  const email = req.headers['x-user-email'];
  
  if (!email) {
    return res.status(401).json({
      success: false,
      message: 'Email header required'
    });
  }
  
  let userData = users.get(email);
  
  if (!userData) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Update allowed fields
  if (req.body.name) userData.name = req.body.name;
  if (req.body.phone) userData.phone = req.body.phone;
  if (req.body.profileImage) userData.profileImage = req.body.profileImage;
  
  userData.updatedAt = new Date().toISOString();
  users.set(email, userData);
  
  console.log('✅ Profile updated for:', email);
  
  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: userData
  });
});

// Mock nearby users endpoint
app.get('/nearby-users/:h3Index', (req, res) => {
  console.log('👥 Nearby users request for:', req.params.h3Index);
  
  res.json({
    success: true,
    users: [
      { name: 'User 1', distance: '0.5 km' },
      { name: 'User 2', distance: '1.2 km' },
      { name: 'User 3', distance: '2.1 km' }
    ],
    count: 3
  });
});

// Test endpoint to simulate receiving an alert notification
app.post('/test-alert-notification', (req, res) => {
  console.log('🧪 Test alert notification triggered');
  
  const testAlert = {
    alertId: 'alert-test-' + Date.now(),
    name: req.body.name || 'Test User',
    phone: req.body.phone || '+353 87 654 3210',
    location: {
      latitude: req.body.latitude || 53.3498,
      longitude: req.body.longitude || -6.2603
    },
    timestamp: new Date().toISOString()
  };
  
  // Add to alert history
  alertHistory.unshift(testAlert);
  if (alertHistory.length > 50) {
    alertHistory.pop(); // Keep only last 50 alerts
  }
  
  console.log('📱 Test notification data:', testAlert);
  
  res.json({
    success: true,
    message: 'Test notification created',
    alert: testAlert,
    instructions: 'In a real scenario, this would be sent as a push notification to nearby users'
  });
});

// Get alert history endpoint
app.get('/alert-history', (req, res) => {
  console.log('📋 Alert history request');
  
  res.json({
    success: true,
    alerts: alertHistory,
    count: alertHistory.length
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 Not Found:', req.method, req.path);
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: err.message
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Raksha Ireland Mock API Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /health              - API health check');
  console.log('  POST /signup              - User registration');
  console.log('  POST /login               - User authentication');
  console.log('  POST /sos                 - Emergency SOS alert');
  console.log('  GET  /admin/users         - Get all users (admin)');
  console.log('  POST /approve-user        - Approve user (admin)');
  console.log('  POST /reject-user         - Reject user (admin)');
  console.log('  POST /register-push-token - Register push token');
  console.log('  POST /update-location     - Update user location');
  console.log('  GET  /profile             - Get user profile');
  console.log('  PUT  /profile             - Update user profile');
  console.log('  GET  /nearby-users/:h3    - Get nearby users');
  console.log('  POST /test-alert-notification - Test alert notification');
  console.log('  GET  /alert-history       - Get alert history');
  console.log('');
  console.log('💡 Press Ctrl+C to stop the server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down Mock API Server...');
  process.exit(0);
});
