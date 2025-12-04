const express = require('express');
const database = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Run database migrations
 * POST /setup/migrate
 * Note: This should be protected or removed in production after initial setup
 */
router.post('/migrate', async (req, res) => {
  try {
    logger.info('Running database migrations...');
    
    const knex = require('../../knexfile');
    const migrationConfig = knex[process.env.NODE_ENV || 'production'];
    
    // Run migrations
    await database.migrate.latest(migrationConfig);
    
    logger.info('Migrations completed successfully');
    
    res.json({
      success: true,
      message: 'Database migrations completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

module.exports = router;
