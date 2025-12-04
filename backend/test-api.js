#!/usr/bin/env node

/**
 * Raksha Ireland API Test Script
 * This script helps you test the API endpoints quickly
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000';
let authToken = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(method, endpoint, data = null, useAuth = false) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      timeout: 5000
    };

    if (data) {
      config.data = data;
    }

    if (useAuth && authToken) {
      config.headers = {
        'Authorization': `Bearer ${authToken}`
      };
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

async function testHealthCheck() {
  log('\n🏥 Testing Health Check...', 'cyan');
  
  const result = await makeRequest('GET', '/health');
  
  if (result.success) {
    logSuccess('Health check passed');
    logInfo(`Uptime: ${Math.round(result.data.uptime)}s`);
    logInfo(`Environment: ${result.data.environment}`);
  } else {
    logError('Health check failed');
    console.log(result.error);
  }
  
  return result.success;
}

async function testUserRegistration() {
  log('\n👤 Testing User Registration...', 'cyan');
  
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    full_name: 'Test User',
    nationality: 'Irish',
    phone_number: '+353123456789'
  };
  
  const result = await makeRequest('POST', '/api/auth/register', testUser);
  
  if (result.success) {
    logSuccess('User registration successful');
    authToken = result.data.token;
    logInfo(`User ID: ${result.data.user.id}`);
    logInfo(`Email: ${result.data.user.email}`);
    logInfo(`Verification Status: ${result.data.user.verification_status}`);
    return { success: true, user: result.data.user, token: result.data.token };
  } else {
    logError('User registration failed');
    console.log(result.error);
    return { success: false };
  }
}

async function testUserLogin(email, password) {
  log('\n🔐 Testing User Login...', 'cyan');
  
  const loginData = { email, password };
  const result = await makeRequest('POST', '/api/auth/login', loginData);
  
  if (result.success) {
    logSuccess('User login successful');
    authToken = result.data.token;
    logInfo(`User: ${result.data.user.full_name}`);
    return { success: true, token: result.data.token };
  } else {
    logError('User login failed');
    console.log(result.error);
    return { success: false };
  }
}

async function testProtectedEndpoint() {
  log('\n🔒 Testing Protected Endpoint...', 'cyan');
  
  if (!authToken) {
    logWarning('No auth token available, skipping protected endpoint test');
    return false;
  }
  
  const result = await makeRequest('GET', '/api/users/profile', null, true);
  
  if (result.success) {
    logSuccess('Protected endpoint access successful');
    logInfo(`User: ${result.data.user.full_name}`);
    logInfo(`Email: ${result.data.user.email}`);
    return true;
  } else {
    logError('Protected endpoint access failed');
    console.log(result.error);
    return false;
  }
}

async function testEmergencyEndpoint() {
  log('\n🚨 Testing Emergency Endpoint...', 'cyan');
  
  if (!authToken) {
    logWarning('No auth token available, skipping emergency endpoint test');
    return false;
  }
  
  const result = await makeRequest('POST', '/api/emergency/test', null, true);
  
  if (result.success) {
    logSuccess('Emergency endpoint access successful');
    return true;
  } else {
    logError('Emergency endpoint access failed');
    console.log(result.error);
    return false;
  }
}

async function testDatabaseConnection() {
  log('\n🗄️  Testing Database Connection...', 'cyan');
  
  const result = await makeRequest('GET', '/health/detailed');
  
  if (result.success && result.data.services?.database?.status === 'healthy') {
    logSuccess('Database connection healthy');
    logInfo(`Response time: ${result.data.services.database.response_time}ms`);
    
    if (result.data.services?.postgis?.status === 'healthy') {
      logSuccess('PostGIS extension available');
    } else {
      logWarning('PostGIS extension not available');
    }
    
    return true;
  } else {
    logError('Database connection failed');
    if (result.data?.services?.database?.error) {
      console.log(result.data.services.database.error);
    }
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting Raksha Ireland API Tests...', 'bright');
  log('=' * 50);
  
  const results = {
    health: false,
    database: false,
    registration: false,
    login: false,
    protected: false,
    emergency: false
  };
  
  // Test health check
  results.health = await testHealthCheck();
  
  // Test database connection
  results.database = await testDatabaseConnection();
  
  // Test user registration
  const registrationResult = await testUserRegistration();
  results.registration = registrationResult.success;
  
  // Test user login (if registration failed, use default credentials)
  if (registrationResult.success) {
    results.login = true; // Already have token from registration
  } else {
    // Try with default test user
    const loginResult = await testUserLogin('admin@example.com', 'admin123');
    results.login = loginResult.success;
  }
  
  // Test protected endpoint
  results.protected = await testProtectedEndpoint();
  
  // Test emergency endpoint
  results.emergency = await testEmergencyEndpoint();
  
  // Summary
  log('\n📊 Test Results Summary:', 'bright');
  log('=' * 30);
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`${test.toUpperCase().padEnd(15)} ${status}`, color);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`, 
      passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    log('\n🎉 All tests passed! Your API is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the logs above for details.', 'yellow');
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'health':
    testHealthCheck();
    break;
  case 'register':
    testUserRegistration();
    break;
  case 'database':
    testDatabaseConnection();
    break;
  case 'all':
  default:
    runAllTests();
    break;
}

module.exports = {
  testHealthCheck,
  testUserRegistration,
  testUserLogin,
  testProtectedEndpoint,
  testEmergencyEndpoint,
  testDatabaseConnection,
  runAllTests
};