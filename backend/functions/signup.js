const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Initialize AWS services
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.USERS_TABLE || 'Users';

exports.handler = async (event) => {
  console.log('Signup request:', JSON.stringify(event, null, 2));
  
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
          error: 'Invalid JSON in request body',
          message: 'Please check your request format'
        })
      };
    }

    // Validate required fields
    const { name, age, sex, county, email, password } = body;
    
    if (!name || !age || !sex || !county || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          message: 'Please provide name, age, sex, county, and email'
        })
      };
    }

    // Validate password strength (basic)
    if (!password || String(password).length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Weak password',
          message: 'Password must be at least 8 characters'
        })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid email format',
          message: 'Please provide a valid email address'
        })
      };
    }

    // Validate age
    if (parseInt(age) < 18) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Age requirement not met',
          message: 'You must be 18 or older to register'
        })
      };
    }

    // Check if user already exists
    const existingUser = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: { email }
    }).promise();

    if (existingUser.Item) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          error: 'User already exists',
          message: 'An account with this email already exists'
        })
      };
    }

    // Create user record
    const userId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Hash password for temporary local verification (before Cognito)
    let tempPasswordHash = null;
    try {
      const salt = await bcrypt.genSalt(10);
      tempPasswordHash = await bcrypt.hash(String(password), salt);
    } catch (hashErr) {
      console.error('Password hash error:', hashErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Password processing failed',
          message: 'Could not process password'
        })
      };
    }
    
    const userItem = {
      email: email.toLowerCase(),
      userId,
      name: name.trim(),
      age: parseInt(age),
      sex,
      county,
      status: 'pending', // pending -> approved -> activated
      createdAt: timestamp,
      updatedAt: timestamp,
      tempPasswordHash,
      // TTL for cleanup (optional: 30 days for pending users)
      ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
    };

    // Save to DynamoDB
    await dynamodb.put({
      TableName: TABLE_NAME,
      Item: userItem,
      ConditionExpression: 'attribute_not_exists(email)' // Prevent race conditions
    }).promise();

    console.log('User created successfully:', userId);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Registration submitted successfully',
        userId,
        status: 'pending',
        nextSteps: 'Your registration is pending admin approval. You will receive an email once approved.'
      })
    };

  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle specific AWS errors
    if (error.code === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          error: 'User already exists',
          message: 'An account with this email already exists'
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process registration. Please try again later.'
      })
    };
  }
};