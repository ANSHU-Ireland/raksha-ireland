const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize AWS services
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

const TABLE_NAME = process.env.USERS_TABLE || 'Users';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

exports.handler = async (event) => {
  console.log('Login request:', JSON.stringify(event, null, 2));
  
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

    const { email, password } = body;
    
    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing email or password'
        })
      };
    }

    // Get user from database
    const userResult = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: { email: email.toLowerCase() }
    }).promise();

    if (!userResult.Item) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid credentials',
          message: 'User not found'
        })
      };
    }

    const user = userResult.Item;

    // Check if user is activated
    if (user.status !== 'activated') {
      let message = 'Account not activated';
      if (user.status === 'pending') {
        message = 'Account pending admin approval';
      } else if (user.status === 'approved') {
        message = 'Account approved but not activated. Please check your email for activation link.';
      }
      
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Account not activated',
          message,
          status: user.status
        })
      };
    }

    // Try Cognito authentication first if configured
    let authSuccess = false;
    if (USER_POOL_ID && CLIENT_ID) {
      try {
        const cognitoAuth = await cognito.adminInitiateAuth({
          UserPoolId: USER_POOL_ID,
          ClientId: CLIENT_ID,
          AuthFlow: 'ADMIN_NO_SRP_AUTH',
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password
          }
        }).promise();

        if (cognitoAuth.AuthenticationResult) {
          authSuccess = true;
        }
      } catch (cognitoError) {
        console.error('Cognito authentication failed:', cognitoError);
        // Fall back to local password verification
      }
    }

    // Local password verification if Cognito fails or is not configured
    if (!authSuccess && user.tempPasswordHash) {
      try {
        authSuccess = await bcrypt.compare(password, user.tempPasswordHash);
      } catch (bcryptError) {
        console.error('Password comparison error:', bcryptError);
      }
    }

    if (!authSuccess) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid credentials',
          message: 'Incorrect email or password'
        })
      };
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user.userId,
      email: user.email,
      name: user.name,
      county: user.county,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET);

    // Update last login timestamp
    await dynamodb.update({
      TableName: TABLE_NAME,
      Key: { email: email.toLowerCase() },
      UpdateExpression: 'SET lastLoginAt = :timestamp',
      ExpressionAttributeValues: {
        ':timestamp': new Date().toISOString()
      }
    }).promise();

    console.log('User logged in successfully:', user.email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Login successful',
        token,
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          county: user.county,
          status: user.status,
          createdAt: user.createdAt
        }
      })
    };

  } catch (error) {
    console.error('Login error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Login failed. Please try again later.'
      })
    };
  }
};