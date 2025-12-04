const knex = require('knex');
const logger = require('../utils/logger');
const knexfile = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexfile[environment];

const database = knex(config);

// Test connection asynchronously (don't block app startup)
const testConnection = async () => {
  try {
    await database.raw('SELECT 1');
    logger.info('Database connected successfully');
  } catch (err) {
    logger.error('Database connection error:', err.message);
    // Retry connection after 5 seconds
    setTimeout(testConnection, 5000);
  }
};

// Don't wait for connection - let app start
testConnection();

module.exports = database;