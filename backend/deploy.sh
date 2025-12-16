#!/bin/bash

# RAKSHA Ireland Backend Deployment Script
# This script zips and deploys all Lambda functions to AWS

set -e  # Exit on any error

echo "🚀 Starting RAKSHA Ireland Backend Deployment..."

# Configuration
REGION="eu-west-1"
FUNCTION_PREFIX="raksha"

# Functions to deploy
FUNCTIONS=("signup" "login" "logout" "approveUser" "activateUser" "sosTrigger" "health")

# Create deployment directory
mkdir -p deploy

echo "📦 Zipping Lambda functions..."

# Zip each function
for func in "${FUNCTIONS[@]}"; do
    echo "  → Zipping $func.js..."
    
    # Create a temporary directory for this function
    mkdir -p "deploy/$func"
    
    # Copy function file and package.json
    cp "functions/$func.js" "deploy/$func/"
    cp package.json "deploy/$func/"
    
    # Install production dependencies
    cd "deploy/$func"
    npm install --production --silent
    
    # Create zip file
    zip -r "../$func.zip" . > /dev/null 2>&1
    
    # Clean up temp directory
    cd ../..
    rm -rf "deploy/$func"
    
    echo "  ✅ $func.zip created"
done

echo ""
echo "🔧 Deploying Lambda functions to AWS..."

# Deploy each function
for func in "${FUNCTIONS[@]}"; do
    FUNCTION_NAME="${FUNCTION_PREFIX}$(echo ${func} | sed 's/.*/\u&/')"  # Capitalize first letter
    
    echo "  → Deploying $FUNCTION_NAME..."
    
    # Check if function exists
    if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" > /dev/null 2>&1; then
        # Update existing function
        aws lambda update-function-code \
            --function-name "$FUNCTION_NAME" \
            --zip-file "fileb://deploy/$func.zip" \
            --region "$REGION" > /dev/null
        echo "  ✅ Updated $FUNCTION_NAME"
    else
        echo "  ⚠️  Function $FUNCTION_NAME does not exist. Please create it first."
        echo "      Use: aws lambda create-function --function-name $FUNCTION_NAME ..."
    fi
done

echo ""
echo "🌐 API Gateway endpoints:"
echo "  Health Check: GET /health"
echo "  User Signup: POST /signup"
echo "  User Login: POST /login"
echo "  Approve User: POST /approve-user"
echo "  Activate User: GET|POST /activate"
echo "  SOS Alert: POST /sos-alert"

echo ""
echo "🧹 Cleaning up..."
rm -rf deploy/

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Update API Gateway to point to new function versions"
echo "  2. Test each endpoint"
echo "  3. Update mobile app with API Gateway URL"
echo "  4. Configure environment variables for Lambda functions"
echo ""