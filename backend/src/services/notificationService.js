const admin = require('firebase-admin');
const db = require('../config/database');

/**
 * Send push notification to a user via FCM
 */
async function sendPushNotification(fcmToken, notification, data = {}) {
  if (!fcmToken) {
    console.log('No FCM token provided, skipping notification');
    return null;
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'emergency_alerts',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return null;
  }
}

/**
 * Find nearby users within a given radius (in kilometers)
 */
async function findNearbyUsers(latitude, longitude, radiusKm = 5, excludeUserId = null) {
  // Haversine formula to calculate distance
  // This is a simplified version - for production, consider using PostGIS
  const query = db('users')
    .select('id', 'full_name', 'fcm_token', 'last_latitude', 'last_longitude')
    .whereNotNull('last_latitude')
    .whereNotNull('last_longitude')
    .whereNotNull('fcm_token')
    .where('status', 'active')
    .where('location_enabled', true);

  if (excludeUserId) {
    query.whereNot('id', excludeUserId);
  }

  const users = await query;

  // Filter by distance using Haversine formula
  const nearbyUsers = users.filter(user => {
    const distance = calculateDistance(
      latitude,
      longitude,
      user.last_latitude,
      user.last_longitude
    );
    return distance <= radiusKm;
  });

  return nearbyUsers;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Send emergency alert notifications to nearby users
 */
async function sendEmergencyAlertNotifications(alert, senderName) {
  try {
    // Find users within 5km radius
    const nearbyUsers = await findNearbyUsers(
      alert.latitude,
      alert.longitude,
      5, // 5km radius
      alert.user_id // Exclude the sender
    );

    console.log(`Found ${nearbyUsers.length} nearby users for emergency alert`);

    // Send notification to each nearby user
    const notificationPromises = nearbyUsers.map(user => {
      return sendPushNotification(
        user.fcm_token,
        {
          title: '🚨 Emergency Alert Nearby',
          body: `${senderName} needs help! ${alert.message || 'Emergency assistance needed'}`,
        },
        {
          type: 'emergency_alert',
          alert_id: alert.id,
          latitude: alert.latitude.toString(),
          longitude: alert.longitude.toString(),
          sender_name: senderName,
        }
      );
    });

    await Promise.all(notificationPromises);

    return {
      success: true,
      notificationsSent: nearbyUsers.length,
    };
  } catch (error) {
    console.error('Error sending emergency alert notifications:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  sendPushNotification,
  findNearbyUsers,
  calculateDistance,
  sendEmergencyAlertNotifications,
};
