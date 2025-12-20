#!/bin/bash
# Upgrade Node.js to v20 on EC2 and reinstall PM2
# Usage: run this script content inside EC2 Instance Connect terminal

set -e

echo "🚀 Upgrading Node.js to v20 (LTS) on EC2"

# Install NVM (if missing)
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"

# Install Node 20 and use it
echo "📦 Installing Node v20..."
nvm install 20
nvm use 20
nvm alias default 20
node -v

# Reinstall PM2 under Node 20
echo "🔧 Reinstalling PM2 globally..."
npm install -g pm2
pm2 -v

# Restart backend with new Node version
cd ~/raksha-ireland/backend
npm ci --only=production || npm install --production
pm2 delete raksha-backend || true
pm2 start local-mock-server.js --name raksha-backend --env production
pm2 save

# Test health
sleep 2
curl -s http://localhost:3000/health || true

echo "✅ Node upgrade complete."