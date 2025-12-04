const logger = require('../utils/logger');

/**
 * Handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  // Default error status
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;
  let code = 'INTERNAL_ERROR';

  // Log error details
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_RESOURCE';
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced resource not found';
    code = 'FOREIGN_KEY_ERROR';
  }

  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large';
      code = 'FILE_SIZE_ERROR';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
      code = 'FILE_COUNT_ERROR';
    } else {
      message = 'File upload error';
      code = 'FILE_UPLOAD_ERROR';
    }
  }

  // CORS error
  if (err.message && err.message.includes('CORS')) {
    statusCode = 403;
    message = 'CORS policy violation';
    code = 'CORS_ERROR';
  }

  // Rate limiting error
  if (err.message && err.message.includes('Too many requests')) {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
  }

  // Response format
  const errorResponse = {
    error: message,
    code,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // Add validation details if available
  if (err.details) {
    errorResponse.details = err.details;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper to catch async errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create application error
 */
class AppError extends Error {
  constructor(message, statusCode, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
  AppError
};