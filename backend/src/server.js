const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const database = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const emergencyRoutes = require('./routes/emergency');
const adminRoutes = require('./routes/admin');
const healthRoutes = require('./routes/health');
const setupRoutes = require('./routes/setup');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Emergency endpoint rate limiting (more restrictive)
const emergencyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 2, // limit each IP to 2 emergency requests per minute
  message: {
    error: 'Emergency alert rate limit exceeded. Please wait before sending another alert.',
    code: 'EMERGENCY_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://admin.raksha-ireland.org',
      'https://raksha-ireland.org'
    ];
    
    // Allow requests with no origin (mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
} else {
  app.use(morgan('dev'));
}

// Health check endpoint (no auth required)
app.use('/health', healthRoutes);

// Setup endpoint (for initial migrations)
app.use('/setup', setupRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/emergency', authenticateToken, emergencyLimiter, emergencyRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Raksha Ireland API',
    version: '1.0.0',
    status: 'active',
    documentation: '/api/docs',
    health: '/health'
  });
});

// API documentation route
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Raksha Ireland API Documentation',
    version: '1.0.0',
    description: 'Emergency alert system API for immigrants and residents in Ireland',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login',
        'POST /api/auth/refresh': 'Refresh access token',
        'POST /api/auth/logout': 'User logout',
        'POST /api/auth/forgot-password': 'Request password reset',
        'POST /api/auth/reset-password': 'Reset password'
      },
      users: {
        'GET /api/users/profile': 'Get user profile',
        'PUT /api/users/profile': 'Update user profile',
        'POST /api/users/upload-documents': 'Upload verification documents',
        'DELETE /api/users/account': 'Delete user account'
      },
      emergency: {
        'POST /api/emergency/trigger': 'Trigger emergency alert',
        'GET /api/emergency/nearby': 'Get nearby emergency alerts',
        'POST /api/emergency/respond': 'Respond to emergency alert',
        'PUT /api/emergency/resolve': 'Resolve emergency alert'
      },
      admin: {
        'GET /api/admin/users': 'Get users for verification',
        'PUT /api/admin/users/:id/verify': 'Verify or reject user',
        'GET /api/admin/alerts': 'Get emergency alerts',
        'GET /api/admin/statistics': 'Get system statistics'
      }
    },
    authentication: 'Bearer Token (JWT)',
    rate_limits: {
      general: '100 requests per 15 minutes',
      emergency: '2 requests per minute'
    }
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown handler
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    database.destroy(); // Close database connections
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    database.destroy(); // Close database connections
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Raksha Ireland API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API Documentation: http://localhost:${PORT}/api/docs`);
  
  // Test database connection
  database.raw('SELECT 1')
    .then(() => {
      logger.info('Database connection established successfully');
    })
    .catch((err) => {
      logger.error('Database connection failed:', err);
    });
});

module.exports = app;