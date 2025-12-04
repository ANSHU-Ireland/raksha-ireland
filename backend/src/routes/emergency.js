const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * Test emergency endpoint
 * POST /api/emergency/test
 */
router.post('/test', asyncHandler(async (req, res) => {
  const user = req.user;
  
  res.json({
    message: 'Emergency system test endpoint',
    user_id: user.id,
    verification_status: user.verification_status,
    location_enabled: user.location_enabled,
    instructions: 'Send POST request with latitude, longitude, and message to trigger emergency alert'
  });
}));

module.exports = router;