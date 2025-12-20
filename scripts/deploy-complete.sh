#!/bin/bash
# Complete EC2 Deployment Script - Run in EC2 Instance Connect
# This upgrades Node, deploys backend + admin panel, configures Nginx

set -e

echo "🚀 Complete Raksha Ireland Deployment to EC2"
echo "=============================================="
echo ""

# Step 1: Upgrade to Node 20
echo "📦 Step 1/5: Upgrading Node.js to v20..."
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20
echo "✅ Node version: $(node -v)"

# Step 2: Pull latest code
echo ""
echo "📥 Step 2/5: Pulling latest code from GitHub..."
cd /home/ubuntu/raksha-ireland
git pull origin master
echo "✅ Code updated"

# Step 3: Install backend dependencies and restart
echo ""
echo "🔧 Step 3/5: Installing backend dependencies..."
cd backend
npm install -g pm2
npm ci --only=production || npm install --production
pm2 delete raksha-backend 2>/dev/null || true
pm2 start local-mock-server.js --name raksha-backend --env production
pm2 save
pm2 startup | tail -1 | sudo bash || true
echo "✅ Backend restarted with PM2"

# Step 4: Build admin panel
echo ""
echo "🎨 Step 4/5: Building admin panel..."
cd ../admin-panel
npm install
npm run build
echo "✅ Admin panel built"

# Step 5: Configure Nginx
echo ""
echo "🌐 Step 5/5: Configuring Nginx..."

# Fix server_names_hash_bucket_size
sudo sed -i 's/# server_names_hash_bucket_size 64;/server_names_hash_bucket_size 128;/' /etc/nginx/nginx.conf || true
if ! grep -q "server_names_hash_bucket_size" /etc/nginx/nginx.conf; then
    sudo sed -i '/http {/a \    server_names_hash_bucket_size 128;' /etc/nginx/nginx.conf
fi

sudo tee /etc/nginx/sites-available/raksha > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Backend API - strip /api prefix
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
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

    location /admin/static {
        alias /home/ubuntu/raksha-ireland/admin-panel/build/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Root redirect
    location = / {
        return 301 /admin;
    }

    # Health check (direct, no /api)
    location = /health {
        proxy_pass http://localhost:3000/health;
    }
}
NGINX_EOF

sudo ln -sf /etc/nginx/sites-available/raksha /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
echo "✅ Nginx configured and restarted"

# Step 6: Test deployment
echo ""
echo "🧪 Testing deployment..."
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
sleep 2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Access Points:"
echo "   Admin Panel:  http://$PUBLIC_IP/admin"
echo "   Backend API:  http://$PUBLIC_IP/api/"
echo "   Health Check: http://$PUBLIC_IP/health"
echo ""
echo "🔍 Backend Status:"
pm2 status
echo ""
echo "Testing backend health:"
curl -s http://localhost:3000/health | head -5
echo ""
echo ""
echo "Testing API routing:"
curl -s http://localhost/api/health | head -5
