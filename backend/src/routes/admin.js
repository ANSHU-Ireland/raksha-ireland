const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * Admin test endpoint
 * GET /api/admin/test
 */
router.get('/test', requireAdmin, asyncHandler(async (req, res) => {
  res.json({
    message: 'Admin system test endpoint',
    admin_user: req.user.email,
    role: req.user.role
  });
}));

module.exports = router;