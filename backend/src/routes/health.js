const express = require('express');
const database = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  };

  try {
    // Check database connection with timeout
    await Promise.race([
      database.raw('SELECT 1'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 3000)
      )
    ]);
    healthcheck.database = 'connected';
  } catch (error) {
    healthcheck.database = 'disconnected';
    logger.warn('Health check - Database connection issue:', error.message);
    // Still return 200 OK even if DB is down - app can start
  }

  res.status(200).json(healthcheck);
});

/**
 * Detailed health check for monitoring
 * GET /health/detailed
 */
router.get('/detailed', async (req, res) => {
  const detailed = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {},
    system: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      node_version: process.version
    }
  };

  // Check database
  try {
    const dbStart = Date.now();
    await database.raw('SELECT 1');
    detailed.services.database = {
      status: 'healthy',
      response_time: Date.now() - dbStart
    };
  } catch (error) {
    detailed.services.database = {
      status: 'unhealthy',
      error: error.message
    };
    detailed.status = 'degraded';
  }

  // Check PostGIS extension
  try {
    await database.raw('SELECT PostGIS_Version()');
    detailed.services.postgis = {
      status: 'healthy'
    };
  } catch (error) {
    detailed.services.postgis = {
      status: 'unhealthy',
      error: error.message
    };
    detailed.status = 'degraded';
  }

  const statusCode = detailed.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(detailed);
});

/**
 * Readiness probe for Kubernetes
 * GET /health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if database is ready
    await database.raw('SELECT 1');
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Liveness probe for Kubernetes
 * GET /health/live
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;