/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.uuid('id').primary();
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('full_name').notNullable();
    table.string('nationality');
    table.string('phone_number');
    table.enum('verification_status', ['pending', 'verified', 'rejected']).defaultTo('pending');
    table.text('verification_notes');
    table.timestamp('verified_at');
    table.enum('role', ['user', 'admin']).defaultTo('user');
    table.enum('status', ['active', 'disabled', 'deleted']).defaultTo('active');
    table.boolean('location_enabled').defaultTo(false);
    table.decimal('last_latitude', 10, 8);
    table.decimal('last_longitude', 11, 8);
    table.timestamp('location_updated_at');
    table.string('fcm_token');
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    
    table.index(['email']);
    table.index(['verification_status']);
    table.index(['role']);
    table.index(['status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('users');
};