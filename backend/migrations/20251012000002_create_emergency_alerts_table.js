/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('emergency_alerts', function(table) {
    table.uuid('id').primary();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.decimal('latitude', 10, 8).notNullable();
    table.decimal('longitude', 11, 8).notNullable();
    table.text('message');
    table.integer('radius_meters').defaultTo(3000);
    table.enum('status', ['active', 'resolved', 'cancelled', 'expired']).defaultTo('active');
    table.integer('responder_count').defaultTo(0);
    table.timestamp('resolved_at');
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['status']);
    table.index(['created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('emergency_alerts');
};