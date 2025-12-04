#!/usr/bin/env node

/**
 * Railway Deployment Script for Raksha Ireland Backend
 * Run: node scripts/deploy-railway.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Raksha Ireland - Railway Deployment Script\n');

// Check if Railway CLI is installed
try {
  execSync('railway --version', { stdio: 'pipe' });
  console.log('✅ Railway CLI detected\n');
} catch (error) {
  console.log('❌ Railway CLI not found. Installing...\n');
  console.log('Run: npm install -g @railway/cli');
  console.log('Then: railway login\n');
  process.exit(1);
}

// Check if logged in
try {
  execSync('railway whoami', { stdio: 'pipe' });
  console.log('✅ Logged in to Railway\n');
} catch (error) {
  console.log('❌ Not logged in to Railway');
  console.log('Run: railway login\n');
  process.exit(1);
}

console.log('📦 Deployment Steps:\n');
console.log('1. Initialize Railway project');
console.log('2. Link to repository');
console.log('3. Add PostgreSQL database');
console.log('4. Configure environment variables');
console.log('5. Deploy backend\n');

// Create railway.json configuration
const railwayConfig = {
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
};

fs.writeFileSync(
  path.join(__dirname, '..', 'railway.json'),
  JSON.stringify(railwayConfig, null, 2)
);

console.log('✅ Created railway.json configuration\n');

console.log('🔧 Manual Steps Required:\n');
console.log('1. Run: railway init');
console.log('2. Select: Create new project');
console.log('3. Name: raksha-ireland-backend');
console.log('4. Run: railway add');
console.log('5. Select: PostgreSQL');
console.log('6. Run: railway run npm run migrate');
console.log('7. Run: railway up');
console.log('\n📊 After deployment:');
console.log('- Run: railway domain');
console.log('- Your API will be at: https://raksha-ireland-backend.up.railway.app\n');

console.log('💡 Set environment variables:');
console.log('railway variables set NODE_ENV=production');
console.log('railway variables set JWT_SECRET=<your-secret>');
console.log('railway variables set FIREBASE_PROJECT_ID=raksha-ireland-app\n');

console.log('✅ Deployment script completed!\n');
