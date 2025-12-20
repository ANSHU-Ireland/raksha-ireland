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

echo ""
echo "========================================"
echo "ADMIN 500 DIAGNOSTICS"
echo "========================================"

# 10. Collect diagnostics without changing config
echo "=== A. Nginx error log (last 50 lines) ==="
sudo tail -n 50 /var/log/nginx/error.log || echo "No error.log readable"
echo ""

echo "=== B. Nginx access log (last 20 lines) ==="
sudo tail -n 20 /var/log/nginx/access.log || echo "No access.log readable"
echo ""

echo "=== C. Enabled site configs ==="
ls -l /etc/nginx/sites-enabled || true
echo ""

echo "=== D. Verify build files and permissions ==="
ls -lah /home/ubuntu/raksha-ireland/admin-panel/build | head -n 20
ls -lah /home/ubuntu/raksha-ireland/admin-panel/build/index.html || echo "index.html missing"
echo ""

echo "=== E. Test direct file serving via Nginx ==="
echo "- HEAD /admin/index.html"
curl -s -I http://localhost/admin/index.html | tr -d '\r'
echo "- HEAD /index.html (root)"
curl -s -I http://localhost/index.html | tr -d '\r'
echo ""

echo "=== F. Parse asset-manifest.json to probe static assets ==="
MANIFEST=/home/ubuntu/raksha-ireland/admin-panel/build/asset-manifest.json
if [ -f "$MANIFEST" ]; then
    MAIN_JS=$(grep -o 'static/js/[^" ]*' "$MANIFEST" | head -n1)
    MAIN_CSS=$(grep -o 'static/css/[^" ]*' "$MANIFEST" | head -n1)
    echo "- Detected JS: $MAIN_JS"
    echo "- Detected CSS: $MAIN_CSS"
    if [ -n "$MAIN_JS" ]; then
        echo "- HEAD /admin/$MAIN_JS"
        curl -s -I "http://localhost/admin/$MAIN_JS" | tr -d '\r'
        echo "- HEAD /$MAIN_JS (root)"
        curl -s -I "http://localhost/$MAIN_JS" | tr -d '\r'
    fi
else
    echo "asset-manifest.json not found"
fi
echo ""

echo "=== G. Current site config content ==="
for f in /etc/nginx/sites-enabled/*; do
    echo "--- $f ---"; sudo sed -n '1,120p' "$f"; echo ""; done
echo ""

echo "=== H. Summarized guidance ==="
echo "- If error.log shows 'open() failed' or 'No such file', check alias/root paths."
echo "- For serving at /admin/, prefer: 'location /admin/ { alias /path/to/build/; try_files $uri $uri/ /admin/index.html; }'"
echo "- For serving at root, prefer 'root /path/to/build;' with 'location / { try_files $uri $uri/ /index.html; }'"
echo "- Ensure /home/ubuntu/raksha-ireland/admin-panel/build and files are world-readable (644) and dirs 755."
echo "- Consider disabling conflicting sites: sudo rm /etc/nginx/sites-enabled/default (then nginx -t && reload)."
echo ""

echo "Diagnostics complete. No config changes applied."

# Optional admin fix: deploy build to /var/www and set alias to that path
if [ "${APPLY_ADMIN_FIX:-0}" = "1" ]; then
    echo ""; echo "========================================"; echo "APPLYING ADMIN PANEL FIX"; echo "========================================";
    echo "=== 1) Preparing /var/www/raksha-admin ==="
    sudo mkdir -p /var/www/raksha-admin
    echo "=== 2) Syncing latest build ==="
    cd /home/ubuntu/raksha-ireland/admin-panel && npm install && npm run build
    sudo rsync -a /home/ubuntu/raksha-ireland/admin-panel/build/ /var/www/raksha-admin/
    echo "=== 3) Setting safe permissions ==="
    sudo find /var/www/raksha-admin -type d -exec chmod 755 {} \;
    sudo find /var/www/raksha-admin -type f -exec chmod 644 {} \;

    echo "=== 4) Updating Nginx site to use /var/www path ==="
    sudo tee /etc/nginx/sites-available/raksha > /dev/null << 'NGINXCONF_ADMIN'
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

        # Admin Panel under /admin
        location = /admin { return 301 /admin/; }
        location /admin/ {
                alias /var/www/raksha-admin/;
                try_files $uri $uri/ /admin/index.html;
                index index.html;
        }

        # Root redirect to admin
        location = / { return 301 /admin/; }
}
NGINXCONF_ADMIN

    echo "=== 5) Disable conflicting site (raksha.conf) if present ==="
    if [ -L /etc/nginx/sites-enabled/raksha.conf ]; then
        sudo rm /etc/nginx/sites-enabled/raksha.conf
        echo "Removed /etc/nginx/sites-enabled/raksha.conf"
    fi

    echo "=== 6) Test and reload Nginx ==="
    sudo nginx -t || { echo "ERROR: Nginx test failed"; exit 1; }
    sudo systemctl reload nginx

    echo "=== 7) Verify admin static asset paths under /admin ==="
    MANIFEST=/var/www/raksha-admin/asset-manifest.json
    if [ -f "$MANIFEST" ]; then
        MAIN_JS=$(grep -o 'static/js/[^" ]*' "$MANIFEST" | head -n1)
        echo "- HEAD /admin/$MAIN_JS"; curl -s -I "http://localhost/admin/$MAIN_JS" | tr -d '\r'
    else
        echo "asset-manifest.json not found in /var/www/raksha-admin"
    fi
fi
