#!/bin/bash
# EC2 Deployment Script for Raksha Ireland Backend
# Run this script on your EC2 instance via EC2 Instance Connect

set -e

echo "=== Raksha Ireland Backend Deployment ==="
echo "Starting deployment process..."

# Update system
echo "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js via nvm
echo "Step 2: Installing Node.js..."
if ! command -v nvm &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

nvm install 20
nvm use 20
node --version
npm --version

# Install PM2
echo "Step 3: Installing PM2..."
npm install -g pm2

# Install Nginx
echo "Step 4: Installing Nginx..."
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx

# Create app directory
echo "Step 5: Creating application directory..."
mkdir -p ~/raksha-ireland/backend
cd ~/raksha-ireland

# Clone repository
echo "Step 6: Cloning repository..."
if [ -d ".git" ]; then
    git pull origin master
else
    git clone https://github.com/ANSHU-Ireland/raksha-ireland.git .
fi

# Install backend dependencies
echo "Step 7: Installing backend dependencies..."
cd ~/raksha-ireland/backend
npm install

# Create environment file
echo "Step 8: Creating .env file..."
cat > ~/raksha-ireland/backend/.env << EOF
JWT_SECRET=${JWT_SECRET:-change-this-secret}
PORT=3000
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
NODE_ENV=production
SENDER_EMAIL=${SENDER_EMAIL:-anshu.kumar72003@gmail.com}
EOF

chmod 600 ~/raksha-ireland/backend/.env

# Configure Nginx
echo "Step 9: Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/raksha << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    location / {
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
}
NGINX_EOF

sudo ln -sf /etc/nginx/sites-available/raksha /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Start backend with PM2
echo "Step 10: Starting backend application..."
cd ~/raksha-ireland/backend
pm2 delete raksha-backend 2>/dev/null || true
pm2 start local-mock-server.js --name raksha-backend --env production
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash

# Test deployment
echo "Step 11: Testing deployment..."
sleep 3
curl -s http://localhost:3000/health && echo ""
curl -s http://localhost/health && echo ""

echo ""
echo "=== Deployment Complete! ==="
echo "Backend is running on:"
echo "  - Local: http://localhost:3000"
echo "  - Public: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "PM2 Status:"
pm2 status
echo ""
echo "View logs: pm2 logs raksha-backend"
