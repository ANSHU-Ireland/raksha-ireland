#!/usr/bin/env node

/**
 * Heroku Deployment Script for Raksha Ireland Backend
 * Prerequisites: Install Heroku CLI - https://devcenter.heroku.com/articles/heroku-cli
 * Run: node scripts/deploy-heroku.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function execute(command, silent = false) {
  try {
    const output = execSync(command, { 
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf-8'
    });
    return output;
  } catch (error) {
    console.error(`Error executing: ${command}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Raksha Ireland - Heroku Deployment Script\n');

  // Check Heroku CLI
  try {
    execute('heroku --version', true);
    console.log('✅ Heroku CLI detected\n');
  } catch {
    console.log('❌ Heroku CLI not found');
    console.log('Install from: https://devcenter.heroku.com/articles/heroku-cli\n');
    process.exit(1);
  }

  // Check login
  try {
    execute('heroku whoami', true);
    console.log('✅ Logged in to Heroku\n');
  } catch {
    console.log('❌ Not logged in to Heroku');
    console.log('Run: heroku login\n');
    process.exit(1);
  }

  const appName = await ask('Enter Heroku app name (e.g., raksha-ireland-api): ');
  
  if (!appName) {
    console.log('❌ App name is required');
    process.exit(1);
  }

  console.log(`\n📦 Creating Heroku app: ${appName}...\n`);
  
  try {
    execute(`heroku create ${appName} --region eu`);
  } catch {
    console.log('⚠️  App might already exist, continuing...\n');
  }

  console.log('📦 Adding PostgreSQL database...\n');
  execute(`heroku addons:create heroku-postgresql:essential-0 -a ${appName}`);

  console.log('⏳ Waiting for database to provision (30 seconds)...\n');
  await new Promise(resolve => setTimeout(resolve, 30000));

  console.log('🔧 Configuring environment variables...\n');

  const jwtSecret = Array.from({length: 64}, () => 
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    .charAt(Math.floor(Math.random() * 62))
  ).join('');

  const jwtRefreshSecret = Array.from({length: 64}, () => 
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    .charAt(Math.floor(Math.random() * 62))
  ).join('');

  execute(`heroku config:set NODE_ENV=production -a ${appName}`);
  execute(`heroku config:set JWT_SECRET=${jwtSecret} -a ${appName}`);
  execute(`heroku config:set JWT_REFRESH_SECRET=${jwtRefreshSecret} -a ${appName}`);
  execute(`heroku config:set JWT_EXPIRES_IN=24h -a ${appName}`);
  execute(`heroku config:set JWT_REFRESH_EXPIRES_IN=7d -a ${appName}`);

  console.log('\n🔑 Manual configuration required:\n');
  console.log(`heroku config:set FIREBASE_PROJECT_ID=raksha-ireland-app -a ${appName}`);
  console.log(`heroku config:set FIREBASE_CLIENT_EMAIL=<your-firebase-email> -a ${appName}`);
  console.log(`heroku config:set FIREBASE_PRIVATE_KEY="<your-private-key>" -a ${appName}`);
  console.log(`heroku config:set SENDGRID_API_KEY=<your-sendgrid-key> -a ${appName}`);
  console.log(`heroku config:set FROM_EMAIL=noreply@raksha-ireland.org -a ${appName}\n`);

  console.log('📤 Deploying to Heroku...\n');
  
  // Initialize git if needed
  if (!fs.existsSync('.git')) {
    execute('git init');
    execute('git add .');
    execute('git commit -m "Initial commit for Heroku deployment"');
  }

  execute(`heroku git:remote -a ${appName}`);
  execute('git push heroku main');

  console.log('\n🗄️  Running database migrations...\n');
  execute(`heroku run npm run migrate -a ${appName}`);

  console.log('\n✅ Deployment completed!\n');
  
  const appUrl = `https://${appName}.herokuapp.com`;
  console.log(`🌐 Your API is live at: ${appUrl}`);
  console.log(`📊 View logs: heroku logs --tail -a ${appName}`);
  console.log(`⚙️  View config: heroku config -a ${appName}\n`);

  rl.close();
}

main().catch(error => {
  console.error('❌ Deployment failed:', error.message);
  rl.close();
  process.exit(1);
});
