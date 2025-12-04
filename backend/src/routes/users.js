const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * Get user profile
 * GET /api/users/profile
 */
router.get('/profile', asyncHandler(async (req, res) => {
  const user = req.user;
  
  res.json({
    message: 'User profile retrieved successfully',
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      nationality: user.nationality,
      phone_number: user.phone_number,
      verification_status: user.verification_status,
      role: user.role,
      location_enabled: user.location_enabled,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  });
}));

module.exports = router;