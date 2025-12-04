const database = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class User {
  /**
   * Find user by ID
   */
  static async findById(id) {
    return await database('users')
      .where('id', id)
      .first();
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    return await database('users')
      .where('email', email.toLowerCase())
      .first();
  }

  /**
   * Create new user
   */
  static async create(userData) {
    const {
      email,
      password,
      full_name,
      nationality,
      phone_number
    } = userData;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = {
      id: uuidv4(),
      email: email.toLowerCase(),
      password_hash,
      full_name,
      nationality,
      phone_number,
      verification_status: 'pending',
      role: 'user',
      location_enabled: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    const [createdUser] = await database('users')
      .insert(user)
      .returning('*');

    // Remove password hash from response
    delete createdUser.password_hash;
    return createdUser;
  }

  /**
   * Update user
   */
  static async update(id, updateData) {
    const updatedUser = await database('users')
      .where('id', id)
      .update({
        ...updateData,
        updated_at: new Date()
      })
      .returning('*');

    if (updatedUser.length === 0) {
      return null;
    }

    // Remove password hash from response
    delete updatedUser[0].password_hash;
    return updatedUser[0];
  }

  /**
   * Delete user
   */
  static async delete(id) {
    const deletedCount = await database('users')
      .where('id', id)
      .del();

    return deletedCount > 0;
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update password
   */
  static async updatePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    return await database('users')
      .where('id', id)
      .update({
        password_hash,
        updated_at: new Date()
      });
  }

  /**
   * Get users by verification status
   */
  static async getByVerificationStatus(status, limit = 50, offset = 0) {
    const users = await database('users')
      .where('verification_status', status)
      .select([
        'id',
        'email',
        'full_name',
        'nationality',
        'phone_number',
        'verification_status',
        'created_at',
        'updated_at'
      ])
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');

    return users;
  }

  /**
   * Update verification status
   */
  static async updateVerificationStatus(id, status, notes = null) {
    return await database('users')
      .where('id', id)
      .update({
        verification_status: status,
        verification_notes: notes,
        verified_at: status === 'verified' ? new Date() : null,
        updated_at: new Date()
      })
      .returning('*');
  }

  /**
   * Get users within radius (for emergency alerts)
   */
  static async getUsersWithinRadius(latitude, longitude, radiusMeters = 3000) {
    // Using PostGIS for geographical queries
    const users = await database.raw(`
      SELECT id, full_name, fcm_token
      FROM users 
      WHERE verification_status = 'verified' 
        AND location_enabled = true
        AND last_location IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
          last_location::geography,
          ?
        )
    `, [longitude, latitude, radiusMeters]);

    return users.rows;
  }

  /**
   * Update user location
   */
  static async updateLocation(id, latitude, longitude) {
    return await database('users')
      .where('id', id)
      .update({
        last_location: database.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)', [longitude, latitude]),
        location_updated_at: new Date(),
        updated_at: new Date()
      });
  }

  /**
   * Update FCM token
   */
  static async updateFCMToken(id, fcmToken) {
    return await database('users')
      .where('id', id)
      .update({
        fcm_token: fcmToken,
        updated_at: new Date()
      });
  }

  /**
   * Get user statistics
   */
  static async getStatistics() {
    const stats = await database('users')
      .select(
        database.raw('COUNT(*) as total_users'),
        database.raw('COUNT(CASE WHEN verification_status = \'verified\' THEN 1 END) as verified_users'),
        database.raw('COUNT(CASE WHEN verification_status = \'pending\' THEN 1 END) as pending_users'),
        database.raw('COUNT(CASE WHEN verification_status = \'rejected\' THEN 1 END) as rejected_users'),
        database.raw('COUNT(CASE WHEN location_enabled = true THEN 1 END) as location_enabled_users')
      )
      .first();

    return stats;
  }

  /**
   * Search users (admin function)
   */
  static async search(query, limit = 50, offset = 0) {
    const users = await database('users')
      .select([
        'id',
        'email',
        'full_name',
        'nationality',
        'phone_number',
        'verification_status',
        'role',
        'created_at',
        'updated_at'
      ])
      .where(function() {
        this.where('email', 'ilike', `%${query}%`)
          .orWhere('full_name', 'ilike', `%${query}%`)
          .orWhere('nationality', 'ilike', `%${query}%`);
      })
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');

    return users;
  }

  /**
   * Get user activity summary
   */
  static async getActivitySummary(id) {
    const alertsTriggered = await database('emergency_alerts')
      .where('user_id', id)
      .count('* as count')
      .first();

    const alertsResponded = await database('alert_responses')
      .where('responder_id', id)
      .count('* as count')
      .first();

    return {
      alerts_triggered: parseInt(alertsTriggered.count) || 0,
      alerts_responded: parseInt(alertsResponded.count) || 0
    };
  }

  /**
   * Anonymize user data (GDPR compliance)
   */
  static async anonymize(id) {
    const anonymizedData = {
      email: `deleted_${id}@example.com`,
      full_name: 'Deleted User',
      phone_number: null,
      fcm_token: null,
      last_location: null,
      verification_notes: 'User requested deletion',
      updated_at: new Date()
    };

    return await database('users')
      .where('id', id)
      .update(anonymizedData);
  }

  /**
   * Soft delete user (mark as deleted)
   */
  static async softDelete(id) {
    return await database('users')
      .where('id', id)
      .update({
        status: 'deleted',
        deleted_at: new Date(),
        updated_at: new Date()
      });
  }
}

module.exports = User;