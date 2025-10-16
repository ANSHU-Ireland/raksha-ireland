const AWS = require('aws-sdk');

// Initialize AWS services
const dynamodb = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES();

const TABLE_NAME = process.env.USERS_TABLE || 'Users';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'admin@rakshaireland.org';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://your-domain.com';

exports.handler = async (event) => {
  console.log('Approve user request:', JSON.stringify(event, null, 2));
  
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

    const { email, adminToken } = body;
    
    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required field: email'
        })
      };
    }

    // TODO: Implement admin authentication
    // For now, we'll skip admin token validation
    // In production, verify adminToken JWT here

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

    // Check if user is already approved
    if (user.status === 'approved' || user.status === 'activated') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'User already approved',
          currentStatus: user.status
        })
      };
    }

    // Update user status to approved
    const timestamp = new Date().toISOString();
    
    await dynamodb.update({
      TableName: TABLE_NAME,
      Key: { email: email.toLowerCase() },
      UpdateExpression: 'SET #status = :status, updatedAt = :timestamp, approvedAt = :timestamp',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'approved',
        ':timestamp': timestamp
      }
    }).promise();

    // Generate activation link
    const activationToken = Buffer.from(JSON.stringify({
      email: user.email,
      userId: user.userId,
      timestamp: timestamp
    })).toString('base64');

    const activationLink = `${FRONTEND_URL}/activate?token=${activationToken}`;

    // Send approval email with activation link
    const emailParams = {
      Source: SENDER_EMAIL,
      Destination: {
        ToAddresses: [user.email]
      },
      Message: {
        Subject: {
          Data: 'RAKSHA Ireland - Account Approved',
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #d32f2f; text-align: center;">RAKSHA Ireland</h1>
                    <h2 style="color: #666;">Account Approved!</h2>
                    
                    <p>Dear ${user.name},</p>
                    
                    <p>Great news! Your RAKSHA Ireland emergency response account has been approved by our administrators.</p>
                    
                    <p><strong>Your Account Details:</strong></p>
                    <ul>
                      <li>Name: ${user.name}</li>
                      <li>Email: ${user.email}</li>
                      <li>County: ${user.county}</li>
                      <li>Registration Date: ${new Date(user.createdAt).toLocaleDateString()}</li>
                    </ul>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                      <h3 style="color: #d32f2f; margin-top: 0;">Next Step: Activate Your Account</h3>
                      <p>Click the button below to activate your account and set up your password:</p>
                      
                      <div style="text-align: center; margin: 20px 0;">
                        <a href="${activationLink}" 
                           style="background: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                          Activate Account
                        </a>
                      </div>
                      
                      <p style="font-size: 12px; color: #666;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${activationLink}">${activationLink}</a>
                      </p>
                    </div>
                    
                    <p><strong>About RAKSHA Ireland:</strong></p>
                    <p>RAKSHA Ireland is an emergency response network that connects community members to provide rapid assistance during emergencies. Once activated, you'll be able to:</p>
                    <ul>
                      <li>Send SOS alerts to nearby community members</li>
                      <li>Receive emergency notifications in your area</li>
                      <li>Access emergency services information</li>
                    </ul>
                    
                    <p><strong>Important Reminders:</strong></p>
                    <ul>
                      <li>For immediate life-threatening emergencies, always call <strong>999 or 112</strong></li>
                      <li>RAKSHA Ireland supplements but does not replace official emergency services</li>
                      <li>Keep your location services enabled for emergency functionality</li>
                    </ul>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    
                    <p style="font-size: 12px; color: #666; text-align: center;">
                      This email was sent by RAKSHA Ireland Emergency Response Network.<br>
                      If you did not request this account, please contact us at admin@rakshaireland.org
                    </p>
                  </div>
                </body>
              </html>
            `,
            Charset: 'UTF-8'
          },
          Text: {
            Data: `
RAKSHA Ireland - Account Approved

Dear ${user.name},

Your RAKSHA Ireland emergency response account has been approved!

Account Details:
- Name: ${user.name}
- Email: ${user.email}
- County: ${user.county}
- Registration Date: ${new Date(user.createdAt).toLocaleDateString()}

Next Step: Activate your account by visiting this link:
${activationLink}

For immediate emergencies, always call 999 or 112.

Best regards,
RAKSHA Ireland Team
admin@rakshaireland.org
            `,
            Charset: 'UTF-8'
          }
        }
      }
    };

    await ses.sendEmail(emailParams).promise();

    console.log('User approved and email sent:', user.email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User approved successfully',
        email: user.email,
        activationLink: activationLink,
        emailSent: true
      })
    };

  } catch (error) {
    console.error('Approve user error:', error);
    
    // Handle specific AWS errors
    if (error.code === 'MessageRejected') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Email sending failed',
          message: 'Unable to send activation email. Please verify email address.'
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to approve user. Please try again later.'
      })
    };
  }
};