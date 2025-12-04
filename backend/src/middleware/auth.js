const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/User');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid token - user not found',
        code: 'INVALID_TOKEN'
      });
    }

    // Check if user is active
    if (user.status === 'disabled') {
      return res.status(401).json({
        error: 'Account disabled',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Add user to request object
    req.user = user;
    next();
    
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware to check if user is verified
 */
const requireVerification = (req, res, next) => {
  if (req.user.verification_status !== 'verified') {
    return res.status(403).json({
      error: 'Account verification required',
      code: 'VERIFICATION_REQUIRED',
      verification_status: req.user.verification_status
    });
  }
  next();
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

/**
 * Middleware to validate API key for external services
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({
      error: 'Invalid API key',
      code: 'INVALID_API_KEY'
    });
  }
  
  next();
};

/**
 * Generate JWT token for user
 */
const generateToken = (userId, email) => {
  return jwt.sign(
    { 
      userId, 
      email,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'raksha-ireland-api',
      audience: 'raksha-ireland-app'
    }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId, email) => {
  return jwt.sign(
    { 
      userId, 
      email,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_REFRESH_SECRET,
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: 'raksha-ireland-api',
      audience: 'raksha-ireland-app'
    }
  );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  authenticateToken,
  requireVerification,
  requireAdmin,
  validateApiKey,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};