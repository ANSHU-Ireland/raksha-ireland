#!/bin/bash
# Deploy using EC2 Instance Connect (Browser-based)
# This script generates commands to run in EC2 Instance Connect terminal

set -e

echo "🚀 Raksha Ireland - EC2 Instance Connect Deployment"
echo "===================================================="
echo ""
echo "⚠️  SSH key authentication is failing. Using EC2 Instance Connect instead."
echo ""
echo "📋 DEPLOYMENT INSTRUCTIONS:"
echo ""
echo "1. Open EC2 Console: https://eu-west-1.console.aws.amazon.com/ec2/home?region=eu-west-1#Instances:"
echo "2. Select your instance (ID: check EC2 dashboard)"
echo "3. Click 'Connect' button → 'EC2 Instance Connect' tab → 'Connect'"
echo "4. In the browser terminal, run these commands:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "# COPY AND PASTE THE COMMANDS BELOW INTO EC2 TERMINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat << 'DEPLOYMENT_SCRIPT'
# Part 1: Update backend code
cd /home/ubuntu/raksha-ireland
git pull origin master || echo "⚠️  Git pull failed, continuing..."

cd /home/ubuntu/raksha-ireland/backend
npm install --production

# Part 2: Restart backend
pm2 restart raksha-backend
pm2 save

# Part 3: Build and deploy admin panel
cd /home/ubuntu/raksha-ireland/admin-panel
npm install
npm run build

# Part 4: Configure Nginx
sudo tee /etc/nginx/sites-available/raksha << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    # Backend API at /api/*
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

    # Admin Panel at /admin
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

    # Root redirect
    location = / {
        return 301 /admin;
    }

    # Health check (no /api prefix for backward compatibility)
    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
NGINX_EOF

# Enable and restart Nginx
sudo ln -sf /etc/nginx/sites-available/raksha /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# Part 5: Test deployment
echo ""
echo "✅ Deployment Complete!"
echo ""
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "📋 Access Points:"
echo "   Admin Panel:  http://$PUBLIC_IP/admin"
echo "   Backend API:  http://$PUBLIC_IP/api/"
echo "   Health Check: http://$PUBLIC_IP/health"
echo ""
curl -s http://localhost:3000/health | head -5
DEPLOYMENT_SCRIPT

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Alternative: Use GitHub to deploy (if repo is public)"
echo "  1. Commit and push local changes: git add . && git commit -m 'Deploy' && git push"
echo "  2. Then in EC2 terminal: cd ~/raksha-ireland && git pull"
echo ""
