const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');

// Initialize AWS services
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

const TABLE_NAME = process.env.USERS_TABLE || 'Users';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

exports.handler = async (event) => {
  console.log('Activate user request:', JSON.stringify(event, null, 2));
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
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
    // Get activation token from query parameters or body
    let token;
    
    if (event.httpMethod === 'GET') {
      token = event.queryStringParameters?.token;
    } else {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      token = body?.token;
    }

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing activation token'
        })
      };
    }

    // Decode activation token
    let tokenData;
    try {
      tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
    } catch (decodeError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid activation token'
        })
      };
    }

    const { email, userId } = tokenData;
    
    if (!email || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid token data'
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
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'User not found'
        })
      };
    }

    const user = userResult.Item;

    // Verify user ID matches
    if (user.userId !== userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid activation token'
        })
      };
    }

    // Check if user is approved
    if (user.status !== 'approved') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'User not approved for activation',
          currentStatus: user.status
        })
      };
    }

    // Check if already activated
    if (user.status === 'activated') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'User already activated'
        })
      };
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    
    // Create Cognito user if USER_POOL_ID is configured
    let cognitoCreated = false;
    if (USER_POOL_ID) {
      try {
        await cognito.adminCreateUser({
          UserPoolId: USER_POOL_ID,
          Username: user.email,
          TemporaryPassword: tempPassword,
          MessageAction: 'SUPPRESS', // Don't send welcome email
          UserAttributes: [
            {
              Name: 'email',
              Value: user.email
            },
            {
              Name: 'name',
              Value: user.name
            },
            {
              Name: 'email_verified',
              Value: 'true'
            }
          ]
        }).promise();
        
        cognitoCreated = true;
        console.log('Cognito user created:', user.email);
      } catch (cognitoError) {
        console.error('Cognito user creation failed:', cognitoError);
        // Continue without Cognito for now
      }
    }

    // Update user status to activated
    const timestamp = new Date().toISOString();
    
    const updateParams = {
      TableName: TABLE_NAME,
      Key: { email: email.toLowerCase() },
      UpdateExpression: 'SET #status = :status, updatedAt = :timestamp, activatedAt = :timestamp',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'activated',
        ':timestamp': timestamp
      }
    };

    // Add temporary password hash if Cognito creation failed
    if (!cognitoCreated) {
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      updateParams.UpdateExpression += ', tempPasswordHash = :tempPassword';
      updateParams.ExpressionAttributeValues[':tempPassword'] = hashedPassword;
    }

    await dynamodb.update(updateParams).promise();

    console.log('User activated successfully:', user.email);

    // Return activation success page HTML for GET requests
    if (event.httpMethod === 'GET') {
      const successHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Activated - RAKSHA Ireland</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; color: #d32f2f; margin-bottom: 30px; }
            .success { background: #e8f5e8; padding: 20px; border-radius: 5px; border-left: 4px solid #4caf50; margin: 20px 0; }
            .credentials { background: #fff3cd; padding: 20px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .button { display: inline-block; background: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>RAKSHA Ireland</h1>
              <h2>Account Activated Successfully!</h2>
            </div>
            
            <div class="success">
              <h3>✅ Welcome to RAKSHA Ireland, ${user.name}!</h3>
              <p>Your emergency response account has been successfully activated.</p>
            </div>
            
            <div class="credentials">
              <h3>🔑 Your Login Credentials</h3>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
              <p><small>Please change this password after your first login.</small></p>
            </div>
            
            <h3>📱 Next Steps:</h3>
            <ol>
              <li>Download the RAKSHA Ireland mobile app</li>
              <li>Log in using the credentials above</li>
              <li>Allow location and notification permissions</li>
              <li>Complete your profile setup</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" class="button">Download Mobile App</a>
            </div>
            
            <h3>⚠️ Important Emergency Information:</h3>
            <ul>
              <li><strong>Life-threatening emergencies:</strong> Call 999 or 112 immediately</li>
              <li><strong>RAKSHA alerts:</strong> Use for community assistance and non-critical emergencies</li>
              <li><strong>Location services:</strong> Keep enabled for emergency functionality</li>
            </ul>
            
            <div class="footer">
              <p>RAKSHA Ireland Emergency Response Network<br>
              Support: admin@rakshaireland.org</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'text/html'
        },
        body: successHtml
      };
    }

    // Return JSON response for API calls
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account activated successfully',
        email: user.email,
        tempPassword: tempPassword,
        cognitoEnabled: cognitoCreated,
        nextSteps: 'Please log in to the mobile app using your email and temporary password'
      })
    };

  } catch (error) {
    console.error('Activate user error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to activate account. Please try again or contact support.'
      })
    };
  }
};

// Generate a secure temporary password
function generateTempPassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  // Ensure at least one character from each set
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}