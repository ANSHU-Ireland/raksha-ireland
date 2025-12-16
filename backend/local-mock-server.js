// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads (10MB limit - industry standard)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'id-doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

// Initialize Supabase client (server-side with service role)
let supabase = null;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Environment check:', {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasSupabaseKey: !!SUPABASE_SERVICE_ROLE_KEY,
  nodeVersion: process.version
});

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️  Supabase credentials not found - using in-memory fallback');
}

// In-memory user storage for mock server
const users = new Map();
// Also keep a flat set of all registered push tokens for debugging
const pushTokens = new Set();
// In-memory fallback for alerts (used if Supabase not configured)
const alertHistoryFallback = [
  {
    id: 'alert-1',
    user_id: 'mock-user-1',
    name: 'Sarah Murphy',
    phone: '+353 87 123 4567',
    latitude: 53.3498,
    longitude: -6.2603,
    h3_index: null,
    status: 'active',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    id: 'alert-2',
    user_id: 'mock-user-2',
    name: 'David O\'Brien',
    phone: '+353 86 765 4321',
    latitude: 53.3510,
    longitude: -6.2590,
    h3_index: null,
    status: 'active',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
  },
  {
    id: 'alert-3',
    user_id: 'mock-user-3',
    name: 'Emma Kelly',
    phone: '+353 85 987 6543',
    latitude: 53.3475,
    longitude: -6.2615,
    h3_index: null,
    status: 'resolved',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  }
];

// Minimal Expo push sender using Node https (no extra deps)
const https = require('https');
async function sendExpoPush(token, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      to: token,
      sound: payload.sound || 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      priority: payload.priority || 'high',
      badge: payload.badge || 1,
    });

    const options = {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      port: 443,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

console.log('🚀 Starting Raksha Ireland API Server...');

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
const AWS = require('aws-sdk');

// Optional SES setup for EC2 (emails will only send if IAM/creds + SES configured)
const ses = new AWS.SES();
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'anshu.kumar72003@gmail.com';

// Mock signup endpoint with document upload
app.post('/signup', upload.single('idDocument'), async (req, res) => {
  console.log('📝 Signup request headers:', {
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent'],
    'x-user-email': req.headers['x-user-email']
  });
  console.log('📝 Signup request body:', req.body);
  console.log('📄 Document uploaded:', req.file ? req.file.filename : 'None');
  
  try {
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
    const email = String(req.body.email || '').toLowerCase();

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
      idDocument: req.file ? {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: `/uploads/${req.file.filename}`
      } : null,
    };
    
    // Store user data
    users.set(email, userData);

    // Attempt to send a registration received email (non-blocking)
    try {
      const emailParams = {
        Source: SENDER_EMAIL,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: 'RAKSHA Ireland - Registration Received', Charset: 'UTF-8' },
          Body: {
            Html: {
              Data: `
                <html>
                  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h1 style="color: #d32f2f; text-align: center;">RAKSHA Ireland</h1>
                      <h2 style="color: #666;">Registration Request Submitted</h2>
                      <p>Dear ${userData.name},</p>
                      <p>Thank you for registering with <strong>RAKSHA Ireland</strong>. Your registration request has been received and sent to our administrators for review.</p>
                      <p><strong>What happens next?</strong></p>
                      <ul>
                        <li>You will receive another email when your account is <strong>approved</strong>.</li>
                        <li>After approval, you will also receive instructions to <strong>activate your account</strong>.</li>
                      </ul>
                      <p>For immediate life-threatening emergencies, always call <strong>999 or 112</strong>.</p>
                    </div>
                  </body>
                </html>
              `, Charset: 'UTF-8'
            },
            Text: { Data: `RAKSHA Ireland - Registration Received\n\nDear ${userData.name},\n\nThank you for registering with RAKSHA Ireland. Your registration request has been received and sent to our administrators for review.\n\nYou will receive another email when your account is approved, followed by activation instructions.\n\nFor immediate emergencies, always call 999 or 112.`, Charset: 'UTF-8' }
          }
        }
      };
      await ses.sendEmail(emailParams).promise();
      console.log('📧 Signup confirmation email sent to:', email);
    } catch (e) {
      console.warn('✉️  Signup email send skipped/failed:', e.message || e);
    }

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
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
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

// SOS alert endpoint - Persists to Supabase
app.post('/sos', async (req, res) => {
  console.log('🆘 SOS Alert received:', {
    location: req.body.location,
    h3Index: req.body.h3Index,
    userId: req.body.userId,
    name: req.body.name,
    phone: req.body.phone
  });
  
  try {
    // Validate userId; do not fall back silently
    const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    const providedUserId = req.body.userId;
    let effectiveUserId = providedUserId;
    if (!UUID_REGEX.test(String(providedUserId || ''))) {
      console.warn('🔎 Invalid or missing userId for SOS, attempting resolution via email header:', providedUserId);
      const email = req.headers['x-user-email'];
      const name = req.body.name || null;
      const phone = req.body.phone || null;
      if (!email || !supabase) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_USER_ID',
          message: 'Valid UUID userId is required to create an alert.'
        });
      }
      // Try to find or create user by email
      const { data: existing, error: findErr } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (findErr) {
        console.error('❌ Supabase user lookup error:', findErr);
        return res.status(500).json({ success: false, message: 'Failed to resolve user' });
      }
      if (existing?.id) {
        effectiveUserId = existing.id;
      } else {
        const newId = crypto.randomUUID();
        const newUser = {
          id: newId,
          email,
          full_name: name,
          phone_number: phone,
          status: 'active',
          role: 'user',
          verification_status: 'verified',
          location_enabled: true,
        };
        const { data: inserted, error: insErr } = await supabase
          .from('users')
          .insert([newUser])
          .select('id')
          .single();
        if (insErr) {
          console.error('❌ Supabase user create error:', insErr);
          return res.status(500).json({ success: false, message: 'Failed to create user' });
        }
        effectiveUserId = inserted.id;
      }
    }
    const alertData = {
      user_id: effectiveUserId,
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
    if (typeof alertData.latitude !== 'number' || typeof alertData.longitude !== 'number') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_LOCATION',
        message: 'Valid latitude and longitude are required.'
      });
    }
    
    let insertedAlert = null;
    
    if (supabase) {
      // Persist to Supabase
      const { data, error } = await supabase
        .from('emergency_alerts')
        .insert([alertData])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }
      
      insertedAlert = data;
      console.log('✅ Alert saved to Supabase:', insertedAlert.id);
    } else {
      // Fallback to in-memory
      insertedAlert = {
        id: 'alert-' + Date.now(),
        ...alertData
      };
      alertHistoryFallback.unshift(insertedAlert);
      if (alertHistoryFallback.length > 100) {
        alertHistoryFallback.pop();
      }
      console.log('⚠️  Alert saved to memory (Supabase not configured)');
    }
    
    console.log('📱 Alert created - preparing push notifications');

    // Send Expo push notifications to all registered users except the sender (if known)
    const senderEmail = req.headers['x-user-email'];
    const recipientTokens = Array.from(users.values())
      .filter(u => u.pushToken && (!senderEmail || u.email !== senderEmail))
      .map(u => u.pushToken);

    const payload = {
      title: '🚨 Emergency Alert - RAKSHA Ireland',
      body: `Emergency SOS from ${req.body.name || 'a nearby user'}`,
      data: {
        type: 'emergency_sos',
        latitude: alertData.latitude,
        longitude: alertData.longitude,
        message: alertData.message,
        alertId: (insertedAlert && insertedAlert.id) || 'local',
      },
      sound: 'default',
      priority: 'high',
      badge: 1,
    };

    if (recipientTokens.length) {
      console.log(`📣 Sending push to ${recipientTokens.length} device(s)`);
      try {
        const results = await Promise.allSettled(recipientTokens.map(t => sendExpoPush(t, payload)));
        const ok = results.filter(r => r.status === 'fulfilled' && r.value?.statusCode === 200).length;
        const fail = results.length - ok;
        console.log(`📬 Push results: success=${ok}, failed=${fail}`);
      } catch (e) {
        console.error('💥 Error sending push notifications:', e.message || e);
      }
    } else {
      console.warn('ℹ️  No recipient push tokens registered yet; skipping push send');
    }
    
    res.json({
      success: true,
      alertId: insertedAlert.id,
      message: 'Emergency alert sent successfully',
      timestamp: insertedAlert.created_at,
      alert: insertedAlert
    });
  } catch (error) {
    console.error('💥 Error creating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create alert',
      error: error.message
    });
  }
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
  // Support both { pushToken: "ExponentPushToken[...]" } and { pushToken: { token: "..." } }
  const raw = req.body?.pushToken;
  const token = typeof raw === 'string' ? raw : (raw && typeof raw.token === 'string' ? raw.token : null);
  const email = req.headers['x-user-email'];

  if (!token) {
    console.warn('⚠️  Missing or invalid push token payload:', req.body);
    return res.status(400).json({ success: false, message: 'Invalid push token' });
  }

  // Store token globally and on the user if available
  pushTokens.add(token);

  if (email) {
    const existing = users.get(email) || { email, status: 'activated' };
    existing.pushToken = token;
    existing.updatedAt = new Date().toISOString();
    users.set(email, existing);
    console.log(`📱 Push token stored for ${email}: ${token.substring(0, 20)}...`);
  } else {
    console.log(`📱 Push token stored (no email header): ${token.substring(0, 20)}...`);
  }

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
app.post('/test-alert-notification', async (req, res) => {
  console.log('🧪 Test alert notification triggered');
  
  try {
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
    
    let insertedAlert = null;
    
    if (supabase) {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .insert([testAlert])
        .select()
        .single();
      
      if (error) throw error;
      insertedAlert = data;
      console.log('✅ Test alert saved to Supabase');
    } else {
      insertedAlert = {
        id: 'alert-test-' + Date.now(),
        ...testAlert
      };
      alertHistoryFallback.unshift(insertedAlert);
      if (alertHistoryFallback.length > 100) {
        alertHistoryFallback.pop();
      }
      console.log('⚠️  Test alert saved to memory');
    }
    
    console.log('📱 Test notification data:', insertedAlert);
    
    res.json({
      success: true,
      message: 'Test notification created',
      alert: insertedAlert,
      instructions: 'In a real scenario, this would be sent as a push notification to nearby users'
    });
  } catch (error) {
    console.error('💥 Error creating test alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test alert',
      error: error.message
    });
  }
});

// Get alert history endpoint - Fetches from Supabase
app.get('/alert-history', async (req, res) => {
  console.log('📋 Alert history request');
  
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status; // optional: 'active', 'resolved', etc.
    
    let alerts = [];
    
    if (supabase) {
      // Fetch from Supabase
      let query = supabase
        .from('emergency_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }
      
      alerts = data || [];
      console.log(`✅ Fetched ${alerts.length} alerts from Supabase`);
    } else {
      // Fallback to in-memory
      alerts = alertHistoryFallback
        .filter(alert => !status || alert.status === status)
        .slice(offset, offset + limit);
      console.log(`⚠️  Fetched ${alerts.length} alerts from memory`);
    }
    
    res.json({
      success: true,
      alerts: alerts,
      count: alerts.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('💥 Error fetching alert history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert history',
      error: error.message
    });
  }
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
