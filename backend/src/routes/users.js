const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://mcyruxndjbxpvcjqdgyx.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
    }
  },
});

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
      profile_pic_url: user.profile_pic_url,
      verification_status: user.verification_status,
      role: user.role,
      location_enabled: user.location_enabled,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  });
}));

/**
 * Update user profile
 * PUT /api/users/profile
 */
router.put('/profile', asyncHandler(async (req, res) => {
  const User = require('../models/User');
  const { full_name, nationality, phone_number, profile_pic_url } = req.body;
  
  // Validate at least one field is provided
  if (!full_name && !nationality && !phone_number && !profile_pic_url) {
    return res.status(400).json({
      error: 'At least one field must be provided for update',
      code: 'VALIDATION_ERROR'
    });
  }
  
  // Build update object
  const updateData = {};
  if (full_name !== undefined) updateData.full_name = full_name;
  if (nationality !== undefined) updateData.nationality = nationality;
  if (phone_number !== undefined) updateData.phone_number = phone_number;
  if (profile_pic_url !== undefined) updateData.profile_pic_url = profile_pic_url;
  
  // Update user
  const updatedUser = await User.update(req.user.id, updateData);
  
  res.json({
    message: 'Profile updated successfully',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      nationality: updatedUser.nationality,
      phone_number: updatedUser.phone_number,
      profile_pic_url: updatedUser.profile_pic_url,
      verification_status: updatedUser.verification_status,
      role: updatedUser.role,
      location_enabled: updatedUser.location_enabled,
      updated_at: updatedUser.updated_at
    }
  });
}));

/**
 * Upload profile picture to Supabase Storage
 * POST /api/users/upload-profile-picture
 */
router.post('/upload-profile-picture', upload.single('profilePicture'), asyncHandler(async (req, res) => {
  const User = require('../models/User');
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const user = req.user;
  const file = req.file;

  console.log(`📤 [UPLOAD] User ${user.email} uploading profile picture`);
  console.log(`📁 File: ${file.originalname}, Size: ${file.size} bytes, Type: ${file.mimetype}`);

  try {
    // Generate unique filename using user ID instead of firebase_uid
    const fileExt = path.extname(file.originalname);
    const fileName = `${user.id}_${Date.now()}${fileExt}`;
    const filePath = `profile-pictures/${fileName}`;

    console.log(`💾 Uploading to Supabase Storage: ${filePath}`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error(`❌ Supabase upload error:`, error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    console.log(`✅ Upload successful:`, data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log(`🔗 Public URL: ${publicUrl}`);

    // Update user profile with new image URL
    const updatedUser = await User.update(user.id, {
      profile_pic_url: publicUrl,
    });

    console.log(`✅ User profile updated with new image URL`);

    res.json({
      message: 'Profile picture uploaded successfully',
      profile_pic_url: publicUrl,
      user: {
        id: updatedUser.id,
        profile_pic_url: updatedUser.profile_pic_url,
      },
    });

  } catch (error) {
    console.error(`❌ [UPLOAD ERROR]`, error);
    res.status(500).json({
      error: 'Failed to upload profile picture',
      details: error.message,
    });
  }
}));

/**
 * Update user location
 * PUT /api/users/location
 */
router.put('/location', [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const User = require('../models/User');
  const { latitude, longitude } = req.body;
  
  // Update user location
  const updatedUser = await User.update(req.user.id, {
    last_latitude: latitude,
    last_longitude: longitude,
    location_updated_at: new Date()
  });
  
  res.json({
    message: 'Location updated successfully',
    location: {
      latitude: updatedUser.last_latitude,
      longitude: updatedUser.last_longitude,
      updated_at: updatedUser.location_updated_at
    }
  });
}));

/**
 * Register FCM token for push notifications
 * PUT /api/users/fcm-token
 */
router.put('/fcm-token', [
  body('fcm_token').notEmpty().withMessage('FCM token is required'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const User = require('../models/User');
  const { fcm_token } = req.body;
  
  // Update user FCM token
  const updatedUser = await User.update(req.user.id, {
    fcm_token: fcm_token
  });
  
  console.log(`[INFO] ${new Date().toISOString()} FCM token registered for user: ${req.user.email}`);
  
  res.json({
    message: 'FCM token registered successfully',
    token_registered: true
  });
}));

/**
 * Enable/disable location tracking
 * PUT /api/users/location-settings
 */
router.put('/location-settings', [
  body('location_enabled').isBoolean().withMessage('location_enabled must be a boolean'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const User = require('../models/User');
  const { location_enabled } = req.body;
  
  // Update location settings
  const updatedUser = await User.update(req.user.id, {
    location_enabled: location_enabled
  });
  
  console.log(`[INFO] ${new Date().toISOString()} Location ${location_enabled ? 'enabled' : 'disabled'} for user: ${req.user.email}`);
  
  res.json({
    message: 'Location settings updated successfully',
    location_enabled: updatedUser.location_enabled
  });
}));

module.exports = router;