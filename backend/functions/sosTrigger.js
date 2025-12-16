const AWS = require('aws-sdk');
const { kRing } = require('h3-js');
const https = require('https');

// Initialize AWS services
const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

const TABLE_NAME = process.env.USERS_TABLE || 'Users';
const SOS_TABLE = process.env.SOS_TABLE || 'SOSAlerts';
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

exports.handler = async (event) => {
  console.log('SOS alert request:', JSON.stringify(event, null, 2));
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  try {
    // Parse request body
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body'
        })
      };
    }

    const { userId, location, h3Index, message } = body;
    
    if (!userId || !location || !h3Index) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: userId, location, h3Index'
        })
      };
    }

    // Validate location data
    if (!location.latitude || !location.longitude) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid location data'
        })
      };
    }

    // Get user information
    let alertUser = null;
    if (userId !== 'anonymous') {
      try {
        const userQuery = await dynamodb.scan({
          TableName: TABLE_NAME,
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId
          }
        }).promise();
        
        if (userQuery.Items && userQuery.Items.length > 0) {
          alertUser = userQuery.Items[0];
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }

    // Generate SOS alert ID
    const sosId = `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Create SOS alert record
    const sosAlert = {
      sosId,
      userId: userId || 'anonymous',
      userEmail: alertUser?.email || 'anonymous',
      userName: alertUser?.name || 'Anonymous User',
      userCounty: alertUser?.county || 'Unknown',
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || null,
        timestamp: location.timestamp || timestamp
      },
      h3Index,
      message: message || 'Emergency SOS Alert',
      status: 'active',
      createdAt: timestamp,
      // TTL: Keep SOS alerts for 24 hours
      ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    };

    // Save SOS alert to database
    await dynamodb.put({
      TableName: SOS_TABLE,
      Item: sosAlert
    }).promise();

    // Find nearby users using H3 proximity
    const nearbyUsers = await findNearbyUsers(h3Index, alertUser?.email);
    
    // Send notifications to nearby users
    const notificationResults = await sendNotificationsToNearbyUsers(
      nearbyUsers, 
      sosAlert,
      location
    );

    // Send emergency services notification if configured
    let emergencyServiceNotified = false;
    if (SNS_TOPIC_ARN) {
      try {
        await sns.publish({
          TopicArn: SNS_TOPIC_ARN,
          Subject: 'RAKSHA Ireland - Emergency SOS Alert',
          Message: JSON.stringify({
            alert: 'EMERGENCY SOS',
            user: alertUser?.name || 'Anonymous User',
            email: alertUser?.email || 'anonymous',
            county: alertUser?.county || 'Unknown',
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy
            },
            timestamp: timestamp,
            sosId: sosId
          }, null, 2)
        }).promise();
        
        emergencyServiceNotified = true;
      } catch (snsError) {
        console.error('Emergency services notification failed:', snsError);
      }
    }

    console.log(`SOS alert processed: ${sosId}, nearby users: ${nearbyUsers.length}, notifications sent: ${notificationResults.successful}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'SOS alert sent successfully',
        sosId,
        nearbyUsersNotified: notificationResults.successful,
        totalNearbyUsers: nearbyUsers.length,
        emergencyServiceNotified,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          h3Index: h3Index
        },
        timestamp
      })
    };

  } catch (error) {
    console.error('SOS alert error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process SOS alert. Please contact emergency services directly if this is a life-threatening emergency.'
      })
    };
  }
};

// Find nearby users using H3 geospatial indexing
async function findNearbyUsers(centerH3Index, excludeEmail = null) {
  try {
    // Get surrounding H3 cells (radius of 2 cells ~= 3-5km at resolution 8)
    const nearbyIndices = kRing(centerH3Index, 2);
    const allUsers = [];

    // Query users for each H3 index
    for (const h3Index of nearbyIndices) {
      try {
        const result = await dynamodb.scan({
          TableName: TABLE_NAME,
          FilterExpression: '#status = :status AND attribute_exists(h3Index) AND h3Index = :h3Index',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': 'activated',
            ':h3Index': h3Index
          }
        }).promise();

        if (result.Items) {
          allUsers.push(...result.Items);
        }
      } catch (error) {
        console.error(`Error querying H3 index ${h3Index}:`, error);
      }
    }

    // Remove duplicates and exclude the alert sender
    const uniqueUsers = allUsers.filter((user, index, self) => 
      index === self.findIndex(u => u.email === user.email) &&
      user.email !== excludeEmail &&
      user.pushToken // Only include users with push tokens
    );

    console.log(`Found ${uniqueUsers.length} nearby activated users`);
    return uniqueUsers;

  } catch (error) {
    console.error('Error finding nearby users:', error);
    return [];
  }
}

// Send push notifications to nearby users
async function sendNotificationsToNearbyUsers(users, sosAlert, location) {
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  if (!users || users.length === 0) {
    return results;
  }

  // Prepare notification payload
  const notificationPayload = {
    title: '🚨 Emergency Alert - RAKSHA Ireland',
    body: `Emergency SOS from ${sosAlert.userName} in ${sosAlert.userCounty}`,
    data: {
      type: 'emergency_sos',
      sosId: sosAlert.sosId,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      userName: sosAlert.userName,
      county: sosAlert.userCounty,
      timestamp: sosAlert.createdAt,
      distance: 'nearby' // Calculate actual distance if needed
    },
    sound: 'emergency',
    priority: 'high',
    badge: 1
  };

  // Minimal Expo push sender using Node https (no extra deps)
  const sendExpoPush = (token, payload) => new Promise((resolve, reject) => {
    const body = JSON.stringify({
      to: token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data,
      priority: 'high',
      badge: 1,
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
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  // Send notifications to each nearby user's Expo token
  for (const user of users) {
    try {
      if (!user.pushToken || !String(user.pushToken).startsWith('ExponentPushToken')) {
        console.warn(`Skipping user without valid Expo token: ${user.email}`);
        continue;
      }
      const resp = await sendExpoPush(user.pushToken, notificationPayload);
      if (resp.statusCode === 200) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({ email: user.email, error: `HTTP ${resp.statusCode}` });
      }
    } catch (error) {
      console.error(`Failed to send notification to ${user.email}:`, error);
      results.failed++;
      results.errors.push({
        email: user.email,
        error: error.message
      });
    }
  }

  return results;
}

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}