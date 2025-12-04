const express = require('express');
const Joi = require('joi');
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
  full_name: Joi.string().min(2).max(100).required(),
  nationality: Joi.string().min(2).max(50).required(),
  phone_number: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.details.map(d => ({ field: d.path[0], message: d.message }))
    });
  }

  const { email, password, full_name, nationality, phone_number } = value;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return res.status(409).json({
      error: 'User already exists with this email',
      code: 'USER_EXISTS'
    });
  }

  // Create new user
  const user = await User.create({
    email,
    password,
    full_name,
    nationality,
    phone_number
  });

  // Generate tokens
  const token = generateToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, user.email);

  logger.info('User registered:', { userId: user.id, email: user.email });

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      nationality: user.nationality,
      verification_status: user.verification_status,
      role: user.role
    },
    token,
    refreshToken
  });
}));

/**
 * User login
 * POST /api/auth/login
 */
router.post('/login', asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.details.map(d => ({ field: d.path[0], message: d.message }))
    });
  }

  const { email, password } = value;

  // Find user
  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(401).json({
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Check password
  const isValidPassword = await User.verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Check if account is active
  if (user.status !== 'active') {
    return res.status(401).json({
      error: 'Account is disabled',
      code: 'ACCOUNT_DISABLED'
    });
  }

  // Generate tokens
  const token = generateToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, user.email);

  logger.info('User logged in:', { userId: user.id, email: user.email });

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      nationality: user.nationality,
      verification_status: user.verification_status,
      role: user.role,
      location_enabled: user.location_enabled
    },
    token,
    refreshToken
  });
}));

/**
 * Test endpoint (protected)
 * GET /api/auth/test
 */
router.get('/test', asyncHandler(async (req, res) => {
  res.json({
    message: 'Authentication test endpoint',
    instructions: 'Include Authorization: Bearer <token> header to test authentication'
  });
}));

module.exports = router;