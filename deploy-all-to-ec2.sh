#!/bin/bash
# Complete Deployment Script for Raksha Ireland
# Deploys both backend and admin panel to EC2

set -e

echo "🚀 Raksha Ireland - Complete EC2 Deployment"
echo "============================================"
echo ""

# Configuration
EC2_HOST="ubuntu@3.254.75.134"
SSH_KEY="$HOME/.ssh/raksha-ireland"
REMOTE_DIR="/home/ubuntu/raksha-ireland"

# Check SSH key
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

echo "📦 Step 1: Building admin panel for production..."
cd admin-panel
npm run build
echo "✅ Admin panel built successfully"
echo ""

echo "📤 Step 2: Uploading files to EC2..."
echo "   - Backend source code"
echo "   - Admin panel build"
echo "   - Configuration files"

# Create remote directories
ssh -i "$SSH_KEY" "$EC2_HOST" "mkdir -p $REMOTE_DIR/backend $REMOTE_DIR/admin-panel/build"

# Upload backend
rsync -avz -e "ssh -i $SSH_KEY" \
    --exclude 'node_modules' \
    --exclude 'uploads' \
    --exclude 'data' \
    ../backend/ "$EC2_HOST:$REMOTE_DIR/backend/"

# Upload admin panel build
rsync -avz -e "ssh -i $SSH_KEY" \
    ./build/ "$EC2_HOST:$REMOTE_DIR/admin-panel/build/"

echo "✅ Files uploaded"
echo ""

echo "🔧 Step 3: Setting up backend on EC2..."
ssh -i "$SSH_KEY" "$EC2_HOST" << 'ENDSSH'
cd /home/ubuntu/raksha-ireland/backend

# Install dependencies
echo "Installing backend dependencies..."
npm install --production

# Create .env if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
JWT_SECRET=raksha-ireland-super-secret-jwt-key-2024-production-v1
JWT_EXPIRATION=7d
SUPABASE_URL=https://mcyruxndjbxpvcjqdgyx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jeXJ1eG5kamJ4cHZjanFkZ3l4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5NjAyMiwiZXhwIjoyMDgwMzcyMDIyfQ.cCh7kqDuoCBw9mD9uXEkG4RCDEu6KbmBmxmUqSZPZ6Q
AWS_REGION=eu-west-1
SENDER_EMAIL=anshu.kumar72003@gmail.com
EOF
fi

# Create data directory
mkdir -p data uploads

# Restart backend with PM2
echo "Restarting backend..."
pm2 delete raksha-backend 2>/dev/null || true
pm2 start local-mock-server.js --name raksha-backend --env production
pm2 save

echo "✅ Backend deployed and running"
ENDSSH

echo ""
echo "🌐 Step 4: Configuring Nginx for admin panel..."
ssh -i "$SSH_KEY" "$EC2_HOST" << 'ENDSSH'
# Configure Nginx to serve both backend API and admin panel
sudo tee /etc/nginx/sites-available/raksha << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    # Backend API
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin Panel
    location /admin {
        alias /home/ubuntu/raksha-ireland/admin-panel/build;
        try_files $uri $uri/ /admin/index.html;
        index index.html;
    }

    # Admin Panel static assets
    location /admin/static {
        alias /home/ubuntu/raksha-ireland/admin-panel/build/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Root - redirect to admin
    location = / {
        return 301 /admin;
    }

    # Health check endpoint (direct, no /api prefix)
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
NGINX_EOF

# Enable site and restart Nginx
sudo ln -sf /etc/nginx/sites-available/raksha /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "✅ Nginx configured"
ENDSSH

echo ""
echo "🧪 Step 5: Testing deployment..."
EC2_IP=$(ssh -i "$SSH_KEY" "$EC2_HOST" "curl -s http://169.254.169.254/latest/meta-data/public-ipv4")

echo "Testing backend health..."
curl -s "http://$EC2_IP/health" | jq '.' || echo "⚠️  Backend may need a moment to start"

echo ""
echo "Testing admin users endpoint..."
curl -s "http://$EC2_IP/api/admin/users" | jq '{success, count}' || echo "⚠️  Check backend logs"

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📋 Access Points:"
echo "   Admin Panel:  http://$EC2_IP/admin"
echo "   Backend API:  http://$EC2_IP/api/"
echo "   Health Check: http://$EC2_IP/health"
echo ""
echo "📊 Management Commands:"
echo "   View backend logs:  ssh -i $SSH_KEY $EC2_HOST 'pm2 logs raksha-backend'"
echo "   Restart backend:    ssh -i $SSH_KEY $EC2_HOST 'pm2 restart raksha-backend'"
echo "   Backend status:     ssh -i $SSH_KEY $EC2_HOST 'pm2 status'"
echo "   Nginx logs:         ssh -i $SSH_KEY $EC2_HOST 'sudo tail -f /var/log/nginx/error.log'"
echo ""
