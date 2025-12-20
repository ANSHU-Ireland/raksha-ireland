#!/bin/bash

echo "========================================"
echo "EC2 DIAGNOSTIC & FIX SCRIPT"
echo "========================================"
echo ""

# 1. Check current Nginx config
echo "=== 1. Current Nginx Config ==="
cat /etc/nginx/sites-available/raksha
echo ""

echo "=== 1a. Check for existing default_server entries ==="
grep -R "default_server" /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/nginx.conf || echo "No default_server found in configs"
echo ""

# 2. Check what backend is actually receiving
echo "=== 2. Backend Status ==="
pm2 status
echo ""

# 3. Test direct backend endpoint
echo "=== 3. Direct Backend Test (localhost:3000/health) ==="
curl -s http://localhost:3000/health | jq '.' || echo "Backend not responding"
echo ""

# 4. Test via Nginx
echo "=== 4. Via Nginx Test (localhost:80/api/health) ==="
curl -s http://localhost/api/health | jq '.' || echo "Nginx routing not working"
echo ""

# 5. Show recent backend logs
echo "=== 5. Recent Backend Logs ==="
pm2 logs backend --lines 10 --nostream
echo ""

# 6. Fix Nginx configuration
echo "=== 6. Applying Fixed Nginx Config (no default_server) ==="
sudo tee /etc/nginx/sites-available/raksha > /dev/null << 'NGINXCONF'
server {
    listen 80;
    listen [::]:80;

    server_name _;

    # Backend API - strip /api prefix
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin Panel
    location /admin/ {
        alias /home/ubuntu/raksha-ireland/admin-panel/build/;
        try_files $uri $uri/ /admin/index.html;
        index index.html;
    }

    # Root - redirect to admin
    location = / {
        return 301 /admin/;
    }
}
NGINXCONF

echo "Nginx config written"
echo ""

# 7. Test and reload Nginx
echo "=== 7. Testing Nginx Config ==="
sudo nginx -t
if [ $? -eq 0 ]; then
    echo ""
    echo "=== 8. Reloading Nginx ==="
    sudo systemctl reload nginx
    echo "Nginx reloaded successfully"
else
    echo "ERROR: Nginx config test failed! Attempting fallback without rewrite..."
    # Fallback: use proxy_pass with trailing slash (no rewrite)
    sudo tee /etc/nginx/sites-available/raksha > /dev/null << 'NGINXCONF_FALLBACK'
server {
    listen 80;
    listen [::]:80;

    server_name _;

    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /admin/ {
        alias /home/ubuntu/raksha-ireland/admin-panel/build/;
        try_files $uri $uri/ /admin/index.html;
        index index.html;
    }

    location = / {
        return 301 /admin/;
    }
}
NGINXCONF_FALLBACK

    echo "=== Retesting Nginx Config (fallback) ==="
    sudo nginx -t || { echo "ERROR: Nginx config still failing"; exit 1; }
    echo "=== Reloading Nginx (fallback) ==="
    sudo systemctl reload nginx
fi
echo ""

# 8. Pull latest code and rebuild admin
echo "=== 9. Pulling Latest Code ==="
cd /home/ubuntu/raksha-ireland
git pull origin master
echo ""

echo "=== 10. Rebuilding Admin Panel ==="
cd /home/ubuntu/raksha-ireland/admin-panel
npm install
npm run build
echo ""

# 9. Final verification
echo "========================================"
echo "FINAL VERIFICATION"
echo "========================================"
echo ""

echo "=== Direct Backend (localhost:3000/health) ==="
curl -s http://localhost:3000/health | jq '.'
echo ""

echo "=== Via Nginx (localhost/api/health) ==="
curl -s http://localhost/api/health | jq '.'
echo ""

echo "=== Admin Panel (localhost/admin/) ==="
curl -s http://localhost/admin/ | grep -o "<title>.*</title>" || echo "Admin panel check failed"
echo ""

echo "========================================"
echo "SCRIPT COMPLETE"
echo "========================================"
echo ""
echo "Now test from your machine:"
echo "  curl http://3.254.75.134/api/health"
echo "  open http://3.254.75.134/admin/"

# 10. Optional fallback: serve admin at root if /admin fails
echo ""
echo "=== Evaluating Admin Panel Fallback ==="
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/admin/)
if [ "$ADMIN_STATUS" -ge 500 ] || [ "$ADMIN_STATUS" -eq 000 ]; then
    echo "Admin at /admin/ not healthy (status: $ADMIN_STATUS). Applying root fallback."
    sudo tee /etc/nginx/sites-available/raksha > /dev/null << 'NGINXCONF_ROOT'
server {
        listen 80;
        listen [::]:80;

        server_name _;

        # Backend API - strip /api prefix
        location /api/ {
                rewrite ^/api/(.*)$ /$1 break;
                proxy_pass http://localhost:3000;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection 'upgrade';
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                proxy_cache_bypass $http_upgrade;
        }

        # Serve Admin Panel at root
        location / {
                alias /home/ubuntu/raksha-ireland/admin-panel/build/;
                try_files $uri $uri/ /index.html;
                index index.html;
        }

        # Health check (direct backend)
        location = /health {
                proxy_pass http://localhost:3000/health;
        }
}
NGINXCONF_ROOT

    echo "=== Testing Nginx Config (root fallback) ==="
    sudo nginx -t || { echo "ERROR: Nginx config failed under root fallback"; exit 1; }
    echo "=== Reloading Nginx (root fallback) ==="
    sudo systemctl reload nginx
    echo "=== Retesting Admin at root ==="
    curl -s http://localhost/ | grep -o "<title>.*</title>" || echo "Admin at root check failed"
    echo "Root fallback applied. Access admin at /"
fi
