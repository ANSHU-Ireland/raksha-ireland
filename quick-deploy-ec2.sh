#!/bin/bash
# Quick EC2 Deployment - Single Command
# Copy and paste this entire block into EC2 Instance Connect terminal

cd /home/ubuntu/raksha-ireland && \
git pull origin master && \
cd backend && \
npm install --production && \
pm2 restart raksha-backend || pm2 start local-mock-server.js --name raksha-backend && \
pm2 save && \
cd ../admin-panel && \
npm install && \
npm run build && \
sudo tee /etc/nginx/sites-available/raksha > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

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

    location = / {
        return 301 /admin;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
NGINX_EOF
sudo ln -sf /etc/nginx/sites-available/raksha /etc/nginx/sites-enabled/ && \
sudo rm -f /etc/nginx/sites-enabled/default && \
sudo nginx -t && sudo systemctl restart nginx && \
sleep 2 && \
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4) && \
echo "" && \
echo "✅ DEPLOYMENT COMPLETE!" && \
echo "" && \
echo "📋 Access Points:" && \
echo "   Admin Panel:  http://$PUBLIC_IP/admin" && \
echo "   Backend API:  http://$PUBLIC_IP/api/" && \
echo "   Health Check: http://$PUBLIC_IP/health" && \
echo "" && \
echo "Backend Status:" && \
pm2 status && \
echo "" && \
echo "Testing backend:" && \
curl -s http://localhost:3000/health
