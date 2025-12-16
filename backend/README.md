# RAKSHA Ireland - Backend

AWS Lambda-based backend for the RAKSHA Ireland emergency response system.

## Architecture

- **AWS Lambda**: Serverless functions for API endpoints
- **DynamoDB**: User data and SOS alerts storage
- **API Gateway**: REST API management
- **SES**: Email notifications for user approval
- **SNS**: Push notifications and emergency services alerts
- **Cognito**: User authentication (optional)

## Lambda Functions

### Core Functions

1. **signup.js** - User registration
   - Validates user data and stores in DynamoDB
   - Sets user status to 'pending'
   - Includes age validation and duplicate email checking

2. **login.js** - User authentication
   - Supports both Cognito and local authentication
   - Returns JWT tokens for API access
   - Validates user activation status

3. **approveUser.js** - Admin approval workflow
   - Changes user status from 'pending' to 'approved'
   - Sends activation email with secure token
   - Triggers email notifications via SES

4. **activateUser.js** - Account activation
   - Processes activation tokens from email links
   - Creates Cognito users with temporary passwords
   - Updates user status to 'activated'

5. **sosTrigger.js** - Emergency SOS handling
   - Processes SOS alerts with location data
   - Uses H3 geospatial indexing for proximity queries
   - Sends notifications to nearby users
   - Logs emergency alerts for audit

6. **health.js** - API health check
   - Simple endpoint for monitoring API status
   - Returns service information and timestamp

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. AWS Configuration

Make sure you have AWS CLI configured:

```bash
aws configure
# Enter your AWS Access Key ID, Secret, Region (eu-west-1), and output format
```

### 3. Environment Variables

Configure the following environment variables for Lambda functions:

```bash
# DynamoDB Tables
USERS_TABLE=Users
SOS_TABLE=SOSAlerts

# Email Configuration
SENDER_EMAIL=admin@rakshaireland.org
FRONTEND_URL=https://your-domain.com

# Authentication
JWT_SECRET=your-super-secret-jwt-key
COGNITO_USER_POOL_ID=eu-west-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Notifications
SNS_TOPIC_ARN=arn:aws:sns:eu-west-1:123456789012:emergency-alerts
```

### 4. Create AWS Resources

#### DynamoDB Tables

```bash
# Users table
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions AttributeName=email,AttributeType=S \
  --key-schema AttributeName=email,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-1

# SOS Alerts table
aws dynamodb create-table \
  --table-name SOSAlerts \
  --attribute-definitions AttributeName=sosId,AttributeType=S \
  --key-schema AttributeName=sosId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-1
```

#### IAM Role for Lambda

Create an IAM role with the following policies:
- `AWSLambdaBasicExecutionRole`
- `AmazonDynamoDBFullAccess` (or custom policy)
- `AmazonSESFullAccess` (or custom policy)
- `AmazonSNSFullAccess` (or custom policy)
- `AmazonCognitoPowerUser` (if using Cognito)

### 5. Deploy Lambda Functions

```bash
# Make deployment script executable (Linux/Mac)
chmod +x deploy.sh
./deploy.sh

# Or use PowerShell script (Windows)
.\deploy.ps1
```

### 5b. Deploy via Serverless Framework (recommended)

This repo includes `serverless.yml` for an end-to-end deploy (functions, HTTP API routes, and DynamoDB tables).

```bash
# Install Serverless CLI (if not already)
npm i -g serverless

# Deploy to AWS (defaults to eu-west-1, stage=dev)
sls deploy --stage dev

# Get the API base URL
sls info --verbose
```

Environment variables can be provided via your shell (e.g. `export JWT_SECRET=...`) or AWS SSM/Secrets Manager. The `serverless.yml` sets sensible defaults for local development.

### 6. Create Lambda Functions (First Time)

```bash
# Example for signup function
aws lambda create-function \
  --function-name rakshaSignup \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_LAMBDA_ROLE \
  --handler signup.handler \
  --zip-file fileb://deploy/signup.zip \
  --timeout 30 \
  --memory-size 256 \
  --region eu-west-1
```

Repeat for all functions: `rakshaLogin`, `rakshaApproveUser`, `rakshaActivateUser`, `rakshaSosTrigger`, `rakshaHealth`

### 7. Create API Gateway

```bash
# Create HTTP API
aws apigatewayv2 create-api \
  --name "RakshaAPI" \
  --protocol-type HTTP \
  --cors-configuration AllowCredentials=false,AllowMethods=*,AllowOrigins=* \
  --region eu-west-1
```

### 8. Configure Routes

Create routes for each Lambda function:
- `GET /health` → rakshaHealth
- `POST /signup` → rakshaSignup
- `POST /login` → rakshaLogin
- `POST /approve-user` → rakshaApproveUser
- `GET /activate` → rakshaActivateUser
- `POST /activate` → rakshaActivateUser
 - `POST /sos` → rakshaSosTrigger
 - `GET /profile` and `PUT /profile` → profile
 - `POST /register-push-token` → registerPushToken
 - `POST /update-location` → updateLocation
 - `GET /nearby-users/{h3Index}` → nearbyUsers
 - `GET /admin/users` → listUsers
 - `POST /reject-user` → rejectUser

## API Endpoints

### Health Check
```
GET /health
```

### User Registration
```
POST /signup
Content-Type: application/json

{
  "name": "John Doe",
  "age": 25,
  "sex": "male",
  "county": "Dublin",
  "email": "john@example.com"
}
```

### User Login
```
POST /login
## Lambda Provisioning

If `backend/deploy.sh` warns that functions do not exist, create them first:

1. Ensure you have an IAM role for Lambda execution with permissions for CloudWatch Logs, DynamoDB, and (optionally) SES.
2. Export required environment variables and create Lambdas:

```bash
cd backend
export ROLE_ARN=arn:aws:iam::<account-id>:role/<lambda-execution-role>
export REGION=eu-west-1
export USERS_TABLE=Users
export SENDER_EMAIL=admin@rakshaireland.org
export FRONTEND_URL=https://your-domain.com
# Optional if using Cognito for auth
export COGNITO_USER_POOL_ID=<pool-id>
export COGNITO_CLIENT_ID=<client-id>

bash scripts/create-lambdas.sh
```

3. Update code on existing functions any time with:

```bash
bash deploy.sh
```

Note: Function names follow `raksha` + capitalized file name, e.g., `signup.js` -> `rakshaSignup`, `approveUser.js` -> `rakshaApproveUser`.

Content-Type: application/json

{
  "email": "john@example.com",
  "password": "user-password"
}
```

### Approve User (Admin)
```
POST /approve-user
Content-Type: application/json

{
  "email": "john@example.com",
  "adminToken": "admin-jwt-token"
}
```

### SOS Alert
```
POST /sos-alert
Content-Type: application/json
Authorization: Bearer user-jwt-token

{
  "userId": "user-uuid",
  "location": {
    "latitude": 53.3498,
    "longitude": -6.2603,
    "accuracy": 10
  },
  "h3Index": "871fb466dffffff",
  "message": "Emergency assistance needed"
}
```

## Security Considerations

1. **Authentication**: All protected endpoints require JWT tokens
2. **CORS**: Configured for web app access
3. **Input Validation**: All functions validate input data
4. **Rate Limiting**: Should be configured at API Gateway level
5. **Encryption**: All data encrypted in transit and at rest
6. **TTL**: Automatic cleanup of old records

## Monitoring

- **CloudWatch Logs**: All functions log important events
- **CloudWatch Metrics**: Monitor function performance
- **SNS Alerts**: Configure alerts for function failures
- **DynamoDB Metrics**: Monitor table performance

## Testing

Use the provided test scripts:

```bash
# Test health endpoint
curl https://your-api-gateway-url.amazonaws.com/health

# Test signup
curl -X POST https://your-api-gateway-url.amazonaws.com/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","age":25,"sex":"male","county":"Dublin","email":"test@example.com"}'
```

## Deployment

1. **Development**: Use local testing with SAM or serverless framework
2. **Staging**: Deploy to staging environment for testing
3. **Production**: Deploy with proper monitoring and alerting

## Support

For technical issues:
- Check CloudWatch logs for errors
- Verify IAM permissions
- Ensure DynamoDB tables exist
- Check SES email verification status

Emergency contact: admin@rakshaireland.org