#!/bin/bash
# Quick deploy script for EC2
# This assumes the EC2 instance has git configured and can pull from the repo

set -e

EC2_IP="3.254.75.134"
KEY_PATH="$HOME/.ssh/raksha-ireland"

echo "🚀 Deploying backend update to EC2..."

# Test SSH connection first
if ! ssh -i "$KEY_PATH" -o ConnectTimeout=5 ubuntu@$EC2_IP "echo '✓ SSH connection OK'"; then
    echo "❌ SSH connection failed. Please check:"
    echo "   1. SSH key exists at: $KEY_PATH"
    echo "   2. Key has correct permissions (400)"
    echo "   3. EC2 security group allows SSH from your IP"
    echo "   4. EC2 instance is running"
    exit 1
fi

# Pull latest code
echo "📥 Pulling latest code on EC2..."
ssh -i "$KEY_PATH" ubuntu@$EC2_IP << 'EOF'
    cd ~/raksha-ireland
    git pull origin master
    cd backend
    npm install --production
EOF

# Restart PM2
echo "♻️  Restarting backend service..."
ssh -i "$KEY_PATH" ubuntu@$EC2_IP "pm2 restart raksha-backend"

# Wait a moment and check health
sleep 3
echo "🏥 Checking API health..."
curl -s http://$EC2_IP/api/health | jq '.'

echo "✅ Deployment complete!"
