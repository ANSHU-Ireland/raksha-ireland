const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const admin = require('../config/firebase');
const { sendEmergencyAlertNotifications } = require('../services/notificationService');

const router = express.Router();

/**
 * Create emergency alert
 * POST /api/emergency/alerts
 */
router.post('/alerts', [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('message').optional().isString().trim(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const user = req.user;
  const { latitude, longitude, message } = req.body;

  // Create alert in database
  const [alert] = await db('emergency_alerts')
    .insert({
      id: uuidv4(),
      user_id: user.id,
      latitude,
      longitude,
      message: message || 'Emergency assistance needed',
      status: 'active',
      created_at: new Date(),
    })
    .returning('*');

  // Find nearby users within 35km radius
  const RADIUS_KM = 35;
  const candidates = await db('users')
    .select('fcm_token', 'full_name', 'id', 'email', 'last_latitude', 'last_longitude', 'location_enabled')
    .whereNotNull('fcm_token')
    .where('id', '!=', user.id);

  // Compute Haversine distance per candidate and log details
  const toRad = (v) => (v * Math.PI) / 180;
  function haversineKm(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  console.log(`[EMERGENCY] Alert created by ${user.email} at (${latitude}, ${longitude})`);
  console.log(`[EMERGENCY] Evaluating ${candidates.length} candidates for ${RADIUS_KM}km radius...`);

  const evaluated = candidates.map(c => {
    const dist = haversineKm(latitude, longitude, c.last_latitude, c.last_longitude);
    const within = dist != null && dist <= RADIUS_KM && c.location_enabled === true;
    console.log(`[DISTANCE] ${c.email || c.id} | enabled=${c.location_enabled} | pos=(${c.last_latitude},${c.last_longitude}) | dist=${dist == null ? 'NULL' : dist.toFixed(3)} km | within=${within}`);
    return { ...c, _distance_km: dist, _within: within };
  });

  // Double-check to exclude current user from nearby recipients
  const nearbyUsers = evaluated.filter(c => c._within && c.id !== user.id);

  // Send push notifications via Firebase Cloud Messaging
  console.log(`[NOTIFICATION] Found ${nearbyUsers.length} nearby users with location enabled (excluding alert creator)`);
  
  if (nearbyUsers.length > 0) {
    const tokens = nearbyUsers.map(u => u.fcm_token).filter(Boolean);
    console.log(`[NOTIFICATION] ${tokens.length} users have FCM tokens`);
    
    if (tokens.length > 0) {
      const notificationPayload = {
        notification: {
          title: '🚨 Emergency Alert Nearby',
          body: `${user.full_name || 'Someone'} needs help nearby: ${message || 'Emergency assistance needed'}`,
        },
        data: {
          type: 'emergency_alert',
          alert_id: alert.id,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          user_name: user.full_name || 'Unknown',
          message: message || 'Emergency assistance needed',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'emergency_alerts',
            priority: 'high',
            sound: 'default',
            defaultSound: true,
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            }
          }
        }
      };

      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          ...notificationPayload,
        });
        
        console.log(`[NOTIFICATION] ✅ Sent notifications to ${response.successCount}/${tokens.length} devices`);
        if (response.failureCount > 0) {
          console.log(`[NOTIFICATION] ⚠️ Failed to send to ${response.failureCount} devices`);
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              console.log(`[NOTIFICATION] Failed token ${idx}: ${resp.error?.message}`);
            }
          });
        }
        
        // Log recipient details (anonymized)
        nearbyUsers.forEach((u, idx) => {
          console.log(`[NOTIFICATION] Recipient ${idx + 1}: ${u.full_name || 'Unknown'} (${u.email || 'no email'})`);
        });
        
      } catch (error) {
        console.error('[NOTIFICATION] ❌ Error sending FCM notifications:', error.message);
        console.error('[NOTIFICATION] Error details:', error);
      }
    } else {
      console.log(`[NOTIFICATION] ⚠️ No valid FCM tokens found for nearby users`);
    }
  } else {
    console.log(`[NOTIFICATION] ℹ️ No nearby users found within ${RADIUS_KM}km radius`);
  }

  res.status(201).json({
    success: true,
    alert,
    message: 'Emergency alert created successfully',
    nearby_users_notified: nearbyUsers.length
  });
}));

/**
 * Get user's emergency alerts
 * GET /api/emergency/alerts
 */
router.get('/alerts', asyncHandler(async (req, res) => {
  const user = req.user;
  const { status, limit = 50, type = 'own' } = req.query;

  // If type is 'nearby', return nearby alerts from other users
  if (type === 'nearby') {
    const RADIUS_KM = 35;
    
    // Get user's current location
    const currentUser = await db('users')
      .where('id', user.id)
      .select('last_latitude', 'last_longitude')
      .first();
    
    if (!currentUser || !currentUser.last_latitude || !currentUser.last_longitude) {
      return res.json({
        success: true,
        alerts: [],
        count: 0,
        message: 'Location not available'
      });
    }

    const nearbyAlerts = await db('emergency_alerts')
      .select('emergency_alerts.*', 'users.full_name as user_name', 'users.email', 'users.phone_number', 'users.profile_pic_url')
      .join('users', 'emergency_alerts.user_id', 'users.id')
      .where('emergency_alerts.user_id', '!=', user.id)
      .where('emergency_alerts.status', 'active')
      .whereRaw(`
        (6371 * acos(
          cos(radians(?)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians(?)) + 
          sin(radians(?)) * sin(radians(latitude))
        )) <= ?
      `, [currentUser.last_latitude, currentUser.last_longitude, currentUser.last_latitude, RADIUS_KM])
      .orderBy('emergency_alerts.created_at', 'desc')
      .limit(parseInt(limit));

    return res.json({
      success: true,
      alerts: nearbyAlerts,
      count: nearbyAlerts.length
    });
  }

  // Default: return user's own alerts
  let query = db('emergency_alerts')
    .where('user_id', user.id)
    .orderBy('created_at', 'desc')
    .limit(parseInt(limit));

  if (status) {
    query = query.where('status', status);
  }

  const alerts = await query;

  res.json({
    success: true,
    alerts,
    count: alerts.length
  });
}));

/**
 * Get single emergency alert
 * GET /api/emergency/alerts/:id
 */
router.get('/alerts/:id', asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  const alert = await db('emergency_alerts')
    .where('id', id)
    .where('user_id', user.id)
    .first();

  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  res.json({
    success: true,
    alert
  });
}));

/**
 * Update emergency alert status
 * PATCH /api/emergency/alerts/:id
 */
router.patch('/alerts/:id', [
  body('status').isIn(['active', 'resolved', 'cancelled']).withMessage('Invalid status'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(`[PATCH /alerts/:id] ❌ Validation error:`, errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const user = req.user;
  const { id } = req.params;
  const { status } = req.body;

  console.log(`[PATCH /alerts/:id] 📥 Request from user ${user.id} to update alert ${id} to status: ${status}`);

  // First, check if alert exists
  const existingAlert = await db('emergency_alerts')
    .where('id', id)
    .first();

  if (!existingAlert) {
    console.log(`[PATCH /alerts/:id] ❌ Alert ${id} not found in database`);
    return res.status(404).json({ error: 'Alert not found' });
  }

  console.log(`[PATCH /alerts/:id] 📋 Alert found - owned by user ${existingAlert.user_id}, current status: ${existingAlert.status}`);

  // Check ownership
  if (existingAlert.user_id !== user.id) {
    console.log(`[PATCH /alerts/:id] ❌ User ${user.id} does not own alert ${id} (owner: ${existingAlert.user_id})`);
    return res.status(403).json({ error: 'You can only update your own alerts' });
  }

  const [alert] = await db('emergency_alerts')
    .where('id', id)
    .where('user_id', user.id)
    .update({
      status,
      updated_at: new Date(),
      resolved_at: status === 'resolved' ? new Date() : null,
    })
    .returning('*');

  if (!alert) {
    console.log(`[PATCH /alerts/:id] ❌ Update failed for alert ${id}`);
    return res.status(404).json({ error: 'Alert update failed' });
  }

  console.log(`[PATCH /alerts/:id] ✅ Alert ${id} updated to status: ${status}`);

  res.json({
    success: true,
    alert,
    message: `Alert marked as ${status}`
  });
}));

/**
 * Test emergency endpoint
 * POST /api/emergency/test
 */
router.post('/test', asyncHandler(async (req, res) => {
  const user = req.user;
  
  res.json({
    message: 'Emergency system test endpoint',
    user_id: user.id,
    verification_status: user.verification_status,
    location_enabled: user.location_enabled,
    instructions: 'Send POST request with latitude, longitude, and message to trigger emergency alert'
  });
}));

module.exports = router;